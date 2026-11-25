package com.trainconcierge.travel;

import com.trainconcierge.catalog.Station;
import com.trainconcierge.catalog.StationRepository;
import com.trainconcierge.catalog.Train;
import com.trainconcierge.catalog.TrainClass;
import com.trainconcierge.catalog.TrainClassRepository;
import com.trainconcierge.catalog.TrainSchedule;
import com.trainconcierge.catalog.TrainScheduleRepository;
import com.trainconcierge.catalog.TrainType;
import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.travel.dto.ClassAvailabilityResponse;
import com.trainconcierge.travel.dto.ClassOptionResponse;
import com.trainconcierge.travel.dto.SearchStationResponse;
import com.trainconcierge.travel.dto.SegmentFromResponse;
import com.trainconcierge.travel.dto.SegmentToResponse;
import com.trainconcierge.travel.dto.StationOptionResponse;
import com.trainconcierge.travel.dto.TrainSearchItemResponse;
import com.trainconcierge.travel.dto.TrainSearchResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TrainSearchService {

    private final StationRepository stationRepository;
    private final TrainScheduleRepository scheduleRepository;
    private final TrainClassRepository trainClassRepository;
    private final SeatInventoryService seatInventoryService;
    private final SettingsService settingsService;
    private final TravelDateValidator travelDateValidator;
    private final SeatAlertService seatAlertService;

    public TrainSearchService(StationRepository stationRepository,
                              TrainScheduleRepository scheduleRepository,
                              TrainClassRepository trainClassRepository,
                              SeatInventoryService seatInventoryService,
                              SettingsService settingsService,
                              TravelDateValidator travelDateValidator,
                              SeatAlertService seatAlertService) {
        this.stationRepository = stationRepository;
        this.scheduleRepository = scheduleRepository;
        this.trainClassRepository = trainClassRepository;
        this.seatInventoryService = seatInventoryService;
        this.settingsService = settingsService;
        this.travelDateValidator = travelDateValidator;
        this.seatAlertService = seatAlertService;
    }

    @Transactional
    public TrainSearchResponse search(TrainSearchCriteria criteria, Long userId) {
        LocalDate travelDate = travelDateValidator.requireValid(criteria.date());
        String fromCode = normalize(criteria.from());
        String toCode = normalize(criteria.to());
        if (fromCode.isEmpty() || toCode.isEmpty()) {
            throw ApiException.validation("from", "Choose an origin and a destination station.");
        }
        if (fromCode.equals(toCode)) {
            throw ApiException.validation("to", "Origin and destination must be different.");
        }
        Station from = stationRepository.findById(fromCode).orElseThrow(ApiException::notFound);
        Station to = stationRepository.findById(toCode).orElseThrow(ApiException::notFound);

        List<Station> stations = stationRepository.findAll();
        Map<String, Station> stationByCode = stations.stream()
                .collect(Collectors.toMap(Station::getCode, station -> station));
        int radius = Math.max(1, settingsService.stationGroupRadiusKm());
        Set<String> originArea = areaAround(from, stations, radius);
        Set<String> destinationArea = areaAround(to, stations, radius);

        Set<String> fromFilter = parseCodes(criteria.fromStations());
        Set<String> toFilter = parseCodes(criteria.toStations());
        Set<TrainType> typeFilter = parseTypes(criteria.types());
        Set<String> classFilter = parseCodes(criteria.classCodes());
        int[] departureWindow = window(criteria.depFrom(), criteria.depTo());
        int[] arrivalWindow = window(criteria.arrFrom(), criteria.arrTo());

        Map<String, List<TrainSchedule>> stopsByTrain = scheduleRepository.findAll().stream()
                .sorted(Comparator.comparingInt(TrainSchedule::getStopOrder))
                .collect(Collectors.groupingBy(stop -> stop.getTrain().getNumber(),
                        LinkedHashMap::new, Collectors.toList()));
        Map<String, List<TrainClass>> classesByTrain = trainClassRepository.findAll().stream()
                .collect(Collectors.groupingBy(trainClass -> trainClass.getTrain().getNumber()));

        List<Candidate> candidates = new ArrayList<>();
        Map<String, Long> fromStationCounts = new HashMap<>();
        Map<String, Long> toStationCounts = new HashMap<>();

        for (List<TrainSchedule> stops : stopsByTrain.values()) {
            Train train = stops.get(0).getTrain();
            if (!runsOn(train, travelDate)) {
                continue;
            }
            if (!typeFilter.isEmpty() && !typeFilter.contains(train.getType())) {
                continue;
            }
            List<Integer> boarding = boardingStops(stops, originArea, destinationArea);
            if (boarding.isEmpty()) {
                continue;
            }
            List<Integer> alighting = alightingStops(stops, originArea, destinationArea);
            if (alighting.isEmpty()) {
                continue;
            }
            List<TrainClass> classes = classesByTrain.getOrDefault(train.getNumber(), List.of());
            if (classes.isEmpty()) {
                continue;
            }
            candidates.add(new Candidate(train, stops, boarding, alighting, classes));
        }

        List<Row> rows = new ArrayList<>();
        for (Candidate candidate : candidates) {
            int boardIndex = chooseBoarding(candidate, fromCode, fromFilter);
            if (boardIndex < 0) {
                continue;
            }
            int alightIndex = chooseAlighting(candidate, boardIndex, toCode, toFilter);
            if (alightIndex < 0) {
                continue;
            }
            TrainSchedule board = candidate.stops().get(boardIndex);
            TrainSchedule alight = candidate.stops().get(alightIndex);
            int departureMinutes = minutes(board.getDepartureTime());
            int arrivalMinutes = minutes(alight.getArrivalTime());
            if (!within(departureMinutes, departureWindow) || !within(arrivalMinutes, arrivalWindow)) {
                continue;
            }
            int duration = durationMinutes(board, alight);
            int segmentKm = alight.getDistanceKm() - board.getDistanceKm();
            int routeKm = candidate.stops().get(candidate.stops().size() - 1).getDistanceKm()
                    - candidate.stops().get(0).getDistanceKm();
            rows.add(new Row(candidate, board, alight, departureMinutes, arrivalMinutes,
                    duration, segmentKm, routeKm));
        }

        List<ClassOptionResponse> classOptions = classOptions(rows);
        if (!classFilter.isEmpty()) {
            rows = rows.stream()
                    .map(row -> row.withClasses(row.classes().stream()
                            .filter(trainClass -> classFilter.contains(trainClass.getClassCode()))
                            .toList()))
                    .filter(row -> !row.classes().isEmpty())
                    .collect(Collectors.toCollection(ArrayList::new));
        }

        for (Row row : rows) {
            for (int index : row.candidate().boarding()) {
                TrainSchedule stop = row.candidate().stops().get(index);
                if (stop.getStopOrder() < row.alight().getStopOrder()) {
                    fromStationCounts.merge(stop.getStation().getCode(), 1L, Long::sum);
                }
            }
            for (int index : row.candidate().alighting()) {
                TrainSchedule stop = row.candidate().stops().get(index);
                if (stop.getStopOrder() > row.board().getStopOrder()) {
                    toStationCounts.merge(stop.getStation().getCode(), 1L, Long::sum);
                }
            }
        }

        Quota quota = criteria.quota() == null ? Quota.GENERAL : criteria.quota();
        int plentyThreshold = settingsService.plentyThreshold();
        int veryLowThreshold = settingsService.veryLowThreshold();
        List<TrainSearchItemResponse> items = new ArrayList<>();
        for (Row row : rows) {
            String trainNumber = row.train().getNumber();
            seatInventoryService.ensureInventory(trainNumber, travelDate);
            seatInventoryService.releaseExpiredForTrain(trainNumber, travelDate);
            Map<String, SeatInventoryService.ClassSeatCounts> counts =
                    seatInventoryService.countsForTrain(trainNumber, travelDate);
            List<ClassAvailabilityResponse> classResponses = row.classes().stream()
                    .sorted(Comparator.comparingInt(trainClass -> TravelClasses.order(trainClass.getClassCode())))
                    .map(trainClass -> classResponse(trainClass, counts, row, quota,
                            plentyThreshold, veryLowThreshold))
                    .toList();
            items.add(new TrainSearchItemResponse(
                    trainNumber,
                    row.train().getName(),
                    row.train().getType(),
                    new SegmentFromResponse(row.board().getStation().getCode(),
                            row.board().getStation().getName(),
                            format(row.board().getDepartureTime()), 0),
                    new SegmentToResponse(row.alight().getStation().getCode(),
                            row.alight().getStation().getName(),
                            format(row.alight().getArrivalTime()),
                            Math.max(0, row.alight().getDayOffset() - row.board().getDayOffset())),
                    row.durationMinutes(),
                    Math.max(0, row.segmentKm()),
                    Arrays.stream(row.train().getRunsOn().split(","))
                            .map(String::trim)
                            .filter(value -> !value.isEmpty())
                            .toList(),
                    classResponses));
        }

        sort(items, criteria.sort());

        if (!items.isEmpty()) {
            seatAlertService.onSearch(userId, items, travelDate);
        }

        return new TrainSearchResponse(
                new SearchStationResponse(from.getCode(), from.getName(), from.getCity()),
                new SearchStationResponse(to.getCode(), to.getName(), to.getCity()),
                travelDate,
                quota.name(),
                items.size(),
                items,
                stationOptions(fromStationCounts, stationByCode),
                stationOptions(toStationCounts, stationByCode),
                classOptions);
    }

    private List<Integer> boardingStops(List<TrainSchedule> stops, Set<String> originArea,
                                        Set<String> destinationArea) {
        List<Integer> result = new ArrayList<>();
        for (int index = 0; index < stops.size(); index++) {
            if (!originArea.contains(stops.get(index).getStation().getCode())) {
                continue;
            }
            boolean hasDestination = false;
            for (int later = index + 1; later < stops.size(); later++) {
                if (destinationArea.contains(stops.get(later).getStation().getCode())) {
                    hasDestination = true;
                    break;
                }
            }
            if (hasDestination) {
                result.add(index);
            }
        }
        return result;
    }

    private List<Integer> alightingStops(List<TrainSchedule> stops, Set<String> originArea,
                                         Set<String> destinationArea) {
        List<Integer> result = new ArrayList<>();
        for (int index = 0; index < stops.size(); index++) {
            if (!destinationArea.contains(stops.get(index).getStation().getCode())) {
                continue;
            }
            boolean hasOrigin = false;
            for (int earlier = 0; earlier < index; earlier++) {
                if (originArea.contains(stops.get(earlier).getStation().getCode())) {
                    hasOrigin = true;
                    break;
                }
            }
            if (hasOrigin) {
                result.add(index);
            }
        }
        return result;
    }

    private static int chooseBoarding(Candidate candidate, String requestedFrom, Set<String> filter) {
        List<Integer> options = candidate.boarding().stream()
                .filter(index -> filter.isEmpty()
                        || filter.contains(candidate.stops().get(index).getStation().getCode()))
                .toList();
        if (options.isEmpty()) {
            return -1;
        }
        for (int index : options) {
            if (candidate.stops().get(index).getStation().getCode().equals(requestedFrom)) {
                return index;
            }
        }
        return options.get(0);
    }

    private static int chooseAlighting(Candidate candidate, int boardIndex, String requestedTo,
                                       Set<String> filter) {
        List<Integer> options = candidate.alighting().stream()
                .filter(index -> index > boardIndex)
                .filter(index -> filter.isEmpty()
                        || filter.contains(candidate.stops().get(index).getStation().getCode()))
                .toList();
        if (options.isEmpty()) {
            return -1;
        }
        for (int index : options) {
            if (candidate.stops().get(index).getStation().getCode().equals(requestedTo)) {
                return index;
            }
        }
        return options.get(options.size() - 1);
    }

    private ClassAvailabilityResponse classResponse(TrainClass trainClass,
                                                     Map<String, SeatInventoryService.ClassSeatCounts> counts,
                                                     Row row, Quota quota,
                                                     int plentyThreshold, int veryLowThreshold) {
        SeatInventoryService.ClassSeatCounts seatCounts = counts.getOrDefault(
                trainClass.getClassCode(),
                new SeatInventoryService.ClassSeatCounts(0, 0, 0, 0));
        int available = simulatedAvailable(seatCounts.available(), quota);
        BigDecimal baseFare = Fares.segmentFare(trainClass.getBaseFare(), row.segmentKm(), row.routeKm());
        BigDecimal fare = Fares.quotaFare(baseFare, quota);
        AvailabilityLevel level = level(available, plentyThreshold, veryLowThreshold);
        String label = available > 0 ? "AVL " + available : "WL";
        return new ClassAvailabilityResponse(
                trainClass.getClassCode(),
                TravelClasses.name(trainClass.getClassCode()),
                fare,
                baseFare,
                available,
                seatCounts.total(),
                label,
                level);
    }

    private static int simulatedAvailable(int available, Quota quota) {
        return switch (quota) {
            case TATKAL -> (int) Math.floor(available * 0.25);
            case PREMIUM_TATKAL -> (int) Math.floor(available * 0.10);
            case LADIES -> (int) Math.floor(available * 0.40);
            case SENIOR_CITIZEN, GENERAL -> available;
        };
    }

    private static AvailabilityLevel level(int available, int plentyThreshold, int veryLowThreshold) {
        if (available <= 0) {
            return AvailabilityLevel.WAITLIST;
        }
        if (available <= veryLowThreshold) {
            return AvailabilityLevel.VERY_LOW;
        }
        if (available <= plentyThreshold) {
            return AvailabilityLevel.LOW;
        }
        return AvailabilityLevel.PLENTY;
    }

    private static void sort(List<TrainSearchItemResponse> items, SearchSort sort) {
        SearchSort effective = sort == null ? SearchSort.DEPARTURE : sort;
        Comparator<TrainSearchItemResponse> comparator = switch (effective) {
            case DEPARTURE -> Comparator.comparingInt(TrainSearchService::departureMinutes);
            case ARRIVAL -> Comparator.comparingInt(TrainSearchService::arrivalMinutes);
            case DURATION -> Comparator.comparingInt(TrainSearchItemResponse::durationMinutes);
            case FARE -> Comparator.comparing(TrainSearchService::lowestFare);
        };
        items.sort(comparator.thenComparingInt(TrainSearchService::departureMinutes)
                .thenComparing(TrainSearchItemResponse::trainNumber));
    }

    private static int departureMinutes(TrainSearchItemResponse item) {
        return minutes(item.from().departure());
    }

    private static int arrivalMinutes(TrainSearchItemResponse item) {
        return item.to().dayOffset() * 1440 + minutes(item.to().arrival());
    }

    private static BigDecimal lowestFare(TrainSearchItemResponse item) {
        return item.classes().stream()
                .map(ClassAvailabilityResponse::fare)
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
    }

    private static int minutes(String clock) {
        if (clock == null || clock.length() < 5) {
            return 0;
        }
        return Integer.parseInt(clock.substring(0, 2)) * 60
                + Integer.parseInt(clock.substring(3, 5));
    }

    private static int minutes(LocalTime time) {
        return time == null ? 0 : time.getHour() * 60 + time.getMinute();
    }

    private static int durationMinutes(TrainSchedule board, TrainSchedule alight) {
        int departure = board.getDayOffset() * 1440 + minutes(board.getDepartureTime());
        int arrival = alight.getDayOffset() * 1440 + minutes(alight.getArrivalTime());
        int duration = arrival - departure;
        return duration < 0 ? duration + 1440 : duration;
    }

    private List<ClassOptionResponse> classOptions(List<Row> rows) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Row row : rows) {
            row.classes().stream()
                    .map(TrainClass::getClassCode)
                    .distinct()
                    .forEach(code -> counts.merge(code, 1L, Long::sum));
        }
        return counts.entrySet().stream()
                .sorted(Comparator.<Map.Entry<String, Long>>comparingInt(
                                entry -> TravelClasses.order(entry.getKey()))
                        .thenComparing(Map.Entry::getKey))
                .map(entry -> new ClassOptionResponse(entry.getKey(),
                        TravelClasses.name(entry.getKey()), entry.getValue()))
                .toList();
    }

    private static List<StationOptionResponse> stationOptions(Map<String, Long> counts,
                                                              Map<String, Station> stations) {
        return counts.entrySet().stream()
                .sorted(Comparator.<Map.Entry<String, Long>>comparingLong(Map.Entry::getValue)
                        .reversed()
                        .thenComparing(entry -> stations.get(entry.getKey()).getName()))
                .map(entry -> new StationOptionResponse(entry.getKey(),
                        stations.get(entry.getKey()).getName(), entry.getValue()))
                .toList();
    }

    private static Set<String> areaAround(Station center, List<Station> stations, int radiusKm) {
        Set<String> codes = new HashSet<>();
        codes.add(center.getCode());
        for (Station station : stations) {
            if (distanceKm(center, station) <= radiusKm) {
                codes.add(station.getCode());
            }
        }
        return codes;
    }

    private static double distanceKm(Station first, Station second) {
        double lat1 = Math.toRadians(first.getLatitude().doubleValue());
        double lon1 = Math.toRadians(first.getLongitude().doubleValue());
        double lat2 = Math.toRadians(second.getLatitude().doubleValue());
        double lon2 = Math.toRadians(second.getLongitude().doubleValue());
        double deltaLat = lat2 - lat1;
        double deltaLon = lon2 - lon1;
        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
                + Math.cos(lat1) * Math.cos(lat2)
                * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        return 2 * 6371 * Math.asin(Math.sqrt(a));
    }

    private static boolean runsOn(Train train, LocalDate date) {
        String day = date.getDayOfWeek()
                .getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
                .toUpperCase(Locale.ROOT);
        return Arrays.stream(train.getRunsOn().split(","))
                .map(String::trim)
                .anyMatch(day::equalsIgnoreCase);
    }

    private static Set<TrainType> parseTypes(String csv) {
        Set<TrainType> types = EnumSet.noneOf(TrainType.class);
        for (String token : split(csv)) {
            if ("OTHER".equals(token)) {
                types.add(TrainType.OTHER);
                types.add(TrainType.EXPRESS);
                continue;
            }
            try {
                types.add(TrainType.valueOf(token));
            } catch (IllegalArgumentException ignored) {
                // Unknown chips are ignored; the UI only sends known values.
            }
        }
        return types;
    }

    private static Set<String> parseCodes(String csv) {
        Set<String> codes = new LinkedHashSet<>();
        for (String token : split(csv)) {
            if (!"ALL".equals(token)) {
                codes.add(token);
            }
        }
        return codes;
    }

    private static List<String> split(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(value -> value.toUpperCase(Locale.ROOT))
                .toList();
    }

    private static int[] window(Integer from, Integer to) {
        if (from == null && to == null) {
            return null;
        }
        int start = clamp(from == null ? 0 : from);
        int end = clamp(to == null ? 1440 : to);
        if (start > end) {
            int swap = start;
            start = end;
            end = swap;
        }
        return new int[]{start, end};
    }

    private static int clamp(int value) {
        return Math.max(0, Math.min(1440, value));
    }

    private static boolean within(int minutes, int[] window) {
        return window == null || (minutes >= window[0] && minutes <= window[1]);
    }

    private static String format(LocalTime time) {
        return time == null ? null : String.format("%02d:%02d", time.getHour(), time.getMinute());
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private record Candidate(Train train, List<TrainSchedule> stops, List<Integer> boarding,
                             List<Integer> alighting, List<TrainClass> classes) {
    }

    private record Row(Candidate candidate, TrainSchedule board, TrainSchedule alight,
                       int departureMinutes, int arrivalMinutes, int durationMinutes,
                       int segmentKm, int routeKm) {

        Train train() {
            return candidate.train();
        }

        List<TrainClass> classes() {
            return candidate.classes();
        }

        Row withClasses(List<TrainClass> classes) {
            return new Row(new Candidate(candidate.train(), candidate.stops(), candidate.boarding(),
                    candidate.alighting(), classes), board, alight, departureMinutes,
                    arrivalMinutes, durationMinutes, segmentKm, routeKm);
        }
    }
}
