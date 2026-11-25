package com.trainconcierge.disruption;

import com.trainconcierge.booking.Booking;
import com.trainconcierge.booking.Journey;
import com.trainconcierge.booking.JourneyStatus;
import com.trainconcierge.catalog.BusTrip;
import com.trainconcierge.catalog.BusTripRepository;
import com.trainconcierge.catalog.Train;
import com.trainconcierge.catalog.TrainClass;
import com.trainconcierge.catalog.TrainClassRepository;
import com.trainconcierge.catalog.TrainSchedule;
import com.trainconcierge.catalog.TrainScheduleRepository;
import com.trainconcierge.disruption.rules.RecommendationCandidate;
import com.trainconcierge.disruption.rules.RecommendationContext;
import com.trainconcierge.disruption.rules.RecommendationRule;
import com.trainconcierge.disruption.rules.RuleResult;
import com.trainconcierge.travel.Fares;
import com.trainconcierge.travel.SeatInventoryService;
import com.trainconcierge.travel.TravelClasses;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class RecommendationEngine {

    private final DisruptionProperties properties;
    private final TrainScheduleRepository scheduleRepository;
    private final TrainClassRepository trainClassRepository;
    private final SeatInventoryService seatInventoryService;
    private final BusTripRepository busTripRepository;
    private final RecommendationRepository recommendationRepository;
    private final List<RecommendationRule> rules;

    public RecommendationEngine(DisruptionProperties properties,
                                TrainScheduleRepository scheduleRepository,
                                TrainClassRepository trainClassRepository,
                                SeatInventoryService seatInventoryService,
                                BusTripRepository busTripRepository,
                                RecommendationRepository recommendationRepository,
                                List<RecommendationRule> rules) {
        this.properties = properties;
        this.scheduleRepository = scheduleRepository;
        this.trainClassRepository = trainClassRepository;
        this.seatInventoryService = seatInventoryService;
        this.busTripRepository = busTripRepository;
        this.recommendationRepository = recommendationRepository;
        this.rules = rules;
    }

    @Transactional
    public void generate(JourneyImpact impact) {
        RecommendationContext context = context(impact);
        List<ScoredCandidate> scored = score(context, candidates(context));
        List<ScoredCandidate> selected = select(scored);
        LocalDateTime now = LocalDateTime.now();
        List<Recommendation> entities = new ArrayList<>();
        for (int index = 0; index < selected.size(); index++) {
            ScoredCandidate item = selected.get(index);
            RecommendationCandidate candidate = item.candidate();
            entities.add(Recommendation.create(
                    impact,
                    candidate.kind(),
                    candidate.refTrainNumber(),
                    candidate.refBusTripId(),
                    candidate.classCode(),
                    candidate.fromStation(),
                    candidate.toStation(),
                    candidate.departureAt(),
                    candidate.arrivalAt(),
                    candidate.fare(),
                    candidate.seatsAvailable(),
                    item.score(),
                    index + 1,
                    index == 0,
                    item.reasons(),
                    item.warnings(),
                    now));
        }
        recommendationRepository.deleteByImpactId(impact.getId());
        recommendationRepository.flush();
        recommendationRepository.saveAll(entities);
        recommendationRepository.flush();
    }

    /**
     * Used when a cancellation is analysed: a same-day option means the passenger is not
     * forced into an overnight stay.
     */
    @Transactional(readOnly = true)
    public boolean hasSameDayAlternative(Disruption disruption, Booking booking) {
        LocalDate date = booking.getTravelDate();
        LocalDateTime threshold = booking.getBoardingTime()
                .plusMinutes(properties.getRebookingBufferMinutes()
                        + properties.getStationTransferMinutes());
        Map<String, List<TrainSchedule>> stopsByTrain = scheduleRepository.findAll().stream()
                .collect(Collectors.groupingBy(stop -> stop.getTrain().getNumber()));
        for (List<TrainSchedule> stops : stopsByTrain.values()) {
            if (stops.isEmpty() || stops.get(0).getTrain().getNumber()
                    .equals(disruption.getTrainNumber())) {
                continue;
            }
            TrainSchedule board = stops.stream()
                    .filter(stop -> stop.getStation().getCode()
                            .equals(booking.getFromStation().getCode()))
                    .findFirst().orElse(null);
            TrainSchedule alight = stops.stream()
                    .filter(stop -> stop.getStation().getCode()
                            .equals(booking.getToStation().getCode()))
                    .findFirst().orElse(null);
            if (board == null || alight == null
                    || board.getStopOrder() >= alight.getStopOrder()
                    || board.getDepartureTime() == null
                    || !runsOn(stops.get(0).getTrain(), date)) {
                continue;
            }
            LocalDateTime departure = date.atTime(board.getDepartureTime())
                    .plusDays(board.getDayOffset());
            if (!departure.isBefore(threshold)) {
                return true;
            }
        }
        List<BusTrip> trips = busTripRepository.findTrips(
                booking.getFromStation().getCity(), booking.getToStation().getCity(),
                List.of(date));
        for (BusTrip trip : trips) {
            LocalDateTime departure = trip.getTravelDate()
                    .atTime(trip.getService().getDepartureTime());
            if (!departure.isBefore(threshold)
                    && trip.getSeatsLeft() >= Math.max(1, booking.getPassengers().size())) {
                return true;
            }
        }
        return false;
    }

    private RecommendationContext context(JourneyImpact impact) {
        Booking booking = impact.getBooking();
        Disruption disruption = impact.getDisruption();
        LocalDateTime boardingTime = booking.getBoardingTime();
        LocalDateTime newArrival = impact.getNewArrival();
        LocalDateTime disruptionTime = boardingTime;
        LocalDateTime earliestDeparture = disruptionTime
                .plusMinutes(properties.getRebookingBufferMinutes()
                        + properties.getStationTransferMinutes());
        LocalDateTime referenceArrival = newArrival == null
                ? booking.getArrivalTime() : newArrival;
        long newDuration = Math.max(1,
                Duration.between(boardingTime, referenceArrival).toMinutes());
        return new RecommendationContext(
                impact.getId(),
                impact.getJourney().getId(),
                booking.getTrain().getNumber(),
                booking.getTrain().getName(),
                booking.getTravelDate(),
                boardingTime,
                booking.getArrivalTime(),
                newArrival,
                disruptionTime,
                earliestDeparture,
                disruption.getDelayMinutesOrZero(),
                Math.max(1, booking.getPassengers().size()),
                booking.getClassCode(),
                booking.getTotalFare(),
                booking.getQuota(),
                disruption.isCancellation(),
                impact.isNeedsHotel(),
                newDuration,
                booking.getFromStation().getCode(),
                booking.getFromStation().getCity(),
                booking.getToStation().getCode(),
                booking.getToStation().getCity());
    }

    private List<RecommendationCandidate> candidates(RecommendationContext context) {
        List<RecommendationCandidate> candidates = new ArrayList<>();
        candidates.addAll(trainCandidates(context));
        candidates.addAll(busCandidates(context));
        for (RecommendationRule rule : rules) {
            candidates.addAll(rule.options(context));
        }
        return candidates;
    }

    private List<RecommendationCandidate> trainCandidates(RecommendationContext context) {
        Map<String, List<TrainSchedule>> stopsByTrain = scheduleRepository.findAll().stream()
                .sorted(Comparator.comparingInt(TrainSchedule::getStopOrder))
                .collect(Collectors.groupingBy(stop -> stop.getTrain().getNumber(),
                        LinkedHashMap::new, Collectors.toList()));
        Map<String, List<TrainClass>> classesByTrain = trainClassRepository.findAll().stream()
                .collect(Collectors.groupingBy(trainClass -> trainClass.getTrain().getNumber()));
        List<RecommendationCandidate> candidates = new ArrayList<>();
        List<LocalDate> dates = List.of(context.travelDate(), context.travelDate().plusDays(1));
        for (List<TrainSchedule> stops : stopsByTrain.values()) {
            if (stops.isEmpty()) {
                continue;
            }
            Train train = stops.get(0).getTrain();
            if (train.getNumber().equals(context.trainNumber())) {
                continue;
            }
            TrainSchedule board = stops.stream()
                    .filter(stop -> stop.getStation().getCode().equals(context.fromStation()))
                    .findFirst().orElse(null);
            TrainSchedule alight = stops.stream()
                    .filter(stop -> stop.getStation().getCode().equals(context.toStation()))
                    .findFirst().orElse(null);
            if (board == null || alight == null || board.getStopOrder() >= alight.getStopOrder()
                    || board.getDepartureTime() == null || alight.getArrivalTime() == null) {
                continue;
            }
            List<TrainClass> classes = classesByTrain.getOrDefault(train.getNumber(), List.of());
            if (classes.isEmpty()) {
                continue;
            }
            int routeKm = stops.get(stops.size() - 1).getDistanceKm()
                    - stops.get(0).getDistanceKm();
            int segmentKm = alight.getDistanceKm() - board.getDistanceKm();
            for (LocalDate date : dates) {
                if (!runsOn(train, date)) {
                    continue;
                }
                LocalDateTime departure = date.atTime(board.getDepartureTime())
                        .plusDays(board.getDayOffset());
                if (departure.isBefore(context.earliestDeparture())) {
                    continue;
                }
                LocalDateTime arrival = date.atTime(alight.getArrivalTime())
                        .plusDays(alight.getDayOffset());
                seatInventoryService.ensureInventory(train.getNumber(), date);
                Map<String, SeatInventoryService.ClassSeatCounts> counts =
                        seatInventoryService.countsForTrain(train.getNumber(), date);
                TrainClass chosen = chooseClass(classes, counts, context);
                if (chosen == null) {
                    continue;
                }
                SeatInventoryService.ClassSeatCounts seatCounts = counts.get(chosen.getClassCode());
                BigDecimal perPassenger = Fares.quotaFare(
                        Fares.segmentFare(chosen.getBaseFare(), segmentKm, routeKm),
                        context.quota());
                Fares.Quote quote = Fares.quote(perPassenger, chosen.getClassCode(),
                        context.passengerCount());
                candidates.add(new RecommendationCandidate(
                        RecommendationKind.TRAIN,
                        train.getNumber(),
                        null,
                        train.getName(),
                        chosen.getClassCode(),
                        context.fromStation(),
                        context.toStation(),
                        departure,
                        arrival,
                        quote.totalFare(),
                        seatCounts == null ? 0 : seatCounts.available(),
                        true,
                        train.getType(),
                        Duration.between(departure, arrival).toMinutes()));
            }
        }
        return candidates;
    }

    private TrainClass chooseClass(List<TrainClass> classes,
                                   Map<String, SeatInventoryService.ClassSeatCounts> counts,
                                   RecommendationContext context) {
        int bookedOrder = TravelClasses.order(context.bookedClass());
        List<TrainClass> ordered = classes.stream()
                .sorted(Comparator
                        .comparingInt((TrainClass trainClass) -> Math.abs(
                                TravelClasses.order(trainClass.getClassCode()) - bookedOrder))
                        .thenComparingInt(trainClass ->
                                TravelClasses.order(trainClass.getClassCode())))
                .toList();
        for (TrainClass trainClass : ordered) {
            SeatInventoryService.ClassSeatCounts seatCounts = counts.get(trainClass.getClassCode());
            if (seatCounts != null && seatCounts.available() >= context.passengerCount()) {
                return trainClass;
            }
        }
        return null;
    }

    private List<RecommendationCandidate> busCandidates(RecommendationContext context) {
        List<LocalDate> dates = List.of(context.travelDate(), context.travelDate().plusDays(1));
        List<RecommendationCandidate> candidates = new ArrayList<>();
        for (BusTrip trip : busTripRepository.findTrips(context.fromCity(), context.toCity(),
                dates)) {
            LocalDateTime departure = trip.getTravelDate()
                    .atTime(trip.getService().getDepartureTime());
            if (departure.isBefore(context.earliestDeparture())
                    || trip.getSeatsLeft() < context.passengerCount()) {
                continue;
            }
            LocalDateTime arrival = departure.plusMinutes(trip.getService().getDurationMinutes());
            BigDecimal fare = trip.getService().getBaseFare()
                    .multiply(BigDecimal.valueOf(context.passengerCount()))
                    .setScale(2, RoundingMode.HALF_UP);
            candidates.add(new RecommendationCandidate(
                    RecommendationKind.BUS,
                    null,
                    trip.getId(),
                    trip.getService().getOperator(),
                    null,
                    context.fromStation(),
                    context.toStation(),
                    departure,
                    arrival,
                    fare,
                    trip.getSeatsLeft(),
                    true,
                    null,
                    trip.getService().getDurationMinutes()));
        }
        return candidates;
    }

    private List<ScoredCandidate> score(RecommendationContext context,
                                        List<RecommendationCandidate> candidates) {
        List<ScoredCandidate> scored = new ArrayList<>();
        for (RecommendationCandidate candidate : candidates) {
            int score = 0;
            List<String> reasons = new ArrayList<>();
            List<String> warnings = new ArrayList<>();
            boolean eligible = true;
            for (RecommendationRule rule : rules) {
                if (!rule.appliesTo(candidate.kind())) {
                    continue;
                }
                RuleResult result = rule.evaluate(context, candidate);
                if (!result.eligible()) {
                    eligible = false;
                    break;
                }
                score += result.scoreDelta();
                if (result.reason() != null) {
                    reasons.add(result.reason());
                }
                if (result.warning() != null) {
                    warnings.add(result.warning());
                }
            }
            if (eligible) {
                scored.add(new ScoredCandidate(candidate, score, reasons, warnings));
            }
        }
        scored.sort(Comparator
                .comparingInt(ScoredCandidate::score).reversed()
                .thenComparingInt(item -> item.candidate().kind().ordinal())
                .thenComparing(item -> item.candidate().departureAt())
                .thenComparing(item -> item.candidate().refKey()));
        return scored;
    }

    private List<ScoredCandidate> select(List<ScoredCandidate> scored) {
        List<ScoredCandidate> selected = new ArrayList<>();
        int trains = 0;
        int buses = 0;
        for (ScoredCandidate item : scored) {
            if (selected.size() >= properties.getMaxRecommendations()) {
                break;
            }
            switch (item.candidate().kind()) {
                case TRAIN -> {
                    if (trains >= properties.getMaxTrains()) {
                        continue;
                    }
                    trains++;
                }
                case BUS -> {
                    if (buses >= properties.getMaxBuses()) {
                        continue;
                    }
                    buses++;
                }
                case WAIT -> {
                }
            }
            selected.add(item);
        }
        return selected;
    }

    private static boolean runsOn(Train train, LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        String shortName = day.name().substring(0, 3);
        return java.util.Arrays.stream(train.getRunsOn().split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .anyMatch(value -> value.equalsIgnoreCase(shortName));
    }

    private record ScoredCandidate(RecommendationCandidate candidate, int score,
                                   List<String> reasons, List<String> warnings) {
        ScoredCandidate {
            reasons = List.copyOf(reasons);
            warnings = List.copyOf(warnings);
        }
    }
}
