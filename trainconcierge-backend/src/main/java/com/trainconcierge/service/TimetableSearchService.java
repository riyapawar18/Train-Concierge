package com.trainconcierge.service;

import com.trainconcierge.dto.timetable.TimetableSearchResult;
import com.trainconcierge.entity.*;
import com.trainconcierge.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Route-stop based train search.
 *
 * <p>This service queries the {@link TrainSchedule}/{@link RouteStop} tables
 * rather than the flat {@code trains.fromStation/toStation} model.
 * It correctly handles trains that merely pass through the requested stations.
 *
 * <h2>Search algorithm</h2>
 * <ol>
 *   <li>Resolve the "from" input to one or more station codes.
 *   <li>Resolve the "to" input to one or more station codes.
 *   <li>Query TrainScheduleRepository for trains where a src-stop comes before a dst-stop.
 *   <li>For each matching train, load the two relevant stops and build the result.
 *   <li>Filter by journey date and operating day where data supports it.
 *   <li>Mark results as bookable when a matching local {@link Train} exists.
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TimetableSearchService {

    private static final String DATA_NOTE =
            "Timetable data from datameet/railways (CC0). " +
            "Schedules may not reflect current operation. " +
            "Fares and seat availability not included.";

    private final TrainScheduleRepository trainScheduleRepo;
    private final RouteStopRepository     routeStopRepo;
    private final StationRepository       stationRepo;
    private final TrainRepository         trainRepo;  // for bookable flag

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Whether the timetable database has been populated.
     * Returns false if no TrainSchedule records exist (not yet imported).
     */
    public boolean hasTimetableData() {
        return trainScheduleRepo.count() > 0;
    }

    /**
     * Search for trains connecting two stations on a given date.
     *
     * @param from  Station name or code (e.g. "Miraj", "MRJ", "Pune Junction")
     * @param to    Station name or code
     * @param date  Journey date; used for operating-day filtering when data exists
     * @return      List of matching results, empty when no trains found
     */
    public List<TimetableSearchResult> search(String from, String to, LocalDate date) {
        if (!StringUtils.hasText(from) || !StringUtils.hasText(to)) return List.of();

        // 1. Resolve station codes
        List<String> fromCodes = resolveStationCodes(from);
        List<String> toCodes   = resolveStationCodes(to);

        if (fromCodes.isEmpty()) {
            log.warn("TimetableSearch: no station code found for '{}'", from);
            return List.of();
        }
        if (toCodes.isEmpty()) {
            log.warn("TimetableSearch: no station code found for '{}'", to);
            return List.of();
        }

        log.debug("TimetableSearch: from='{}' codes={}, to='{}' codes={}, date={}",
                from, fromCodes, to, toCodes, date);

        // 2. Determine operating day if date is provided
        String dayOfWeek = date != null
                ? String.valueOf(date.getDayOfWeek().getValue())  // 1=Mon … 7=Sun
                : null;

        // 3. Query for each from/to code pair and collect unique trains
        Set<Long> seen = new LinkedHashSet<>();
        List<TimetableSearchResult> results = new ArrayList<>();

        for (String fromCode : fromCodes) {
            for (String toCode : toCodes) {
                if (fromCode.equalsIgnoreCase(toCode)) continue;

                List<TrainSchedule> trains = dayOfWeek != null
                        ? trainScheduleRepo.findTrainsBetweenStationsOnDay(fromCode, toCode, dayOfWeek)
                        : trainScheduleRepo.findTrainsBetweenStations(fromCode, toCode);

                for (TrainSchedule ts : trains) {
                    if (!seen.add(ts.getId())) continue;

                    TimetableSearchResult result = buildResult(ts, fromCode, toCode, date);
                    if (result != null) results.add(result);
                }
            }
        }

        log.info("TimetableSearch: {} results for '{}' → '{}' on {}", results.size(), from, to, date);
        return results;
    }

    /** Resolve a user's input string to a list of station codes. */
    public List<String> resolveStationCodes(String input) {
        if (!StringUtils.hasText(input)) return List.of();
        String trimmed = input.trim();

        // 1. Exact code match (e.g. user typed "MRJ" or "PUNE")
        Optional<Station> exact = stationRepo.findByStationCodeIgnoreCase(trimmed);
        if (exact.isPresent()) return List.of(exact.get().getStationCode());

        // 2. Partial name / code search
        List<Station> matches = stationRepo.findByCodeOrNameContaining(trimmed);
        if (!matches.isEmpty()) {
            return matches.stream()
                    .map(Station::getStationCode)
                    .distinct()
                    .collect(Collectors.toList());
        }

        // 3. Fall back: uppercase the input as a best-effort station code
        // (e.g. if user typed "MRJ" but station table is empty)
        log.debug("TimetableSearch: no station found for '{}', using as raw code", trimmed);
        return List.of(trimmed.toUpperCase());
    }

    // ── Result building ───────────────────────────────────────────────────────

    private TimetableSearchResult buildResult(
            TrainSchedule ts, String fromCode, String toCode, LocalDate date) {

        // Load both stops for this train
        List<RouteStop> stops = routeStopRepo
                .findByTrainScheduleIdOrderByStopSequenceAsc(ts.getId());

        RouteStop srcStop = null;
        RouteStop dstStop = null;

        for (RouteStop stop : stops) {
            if (stop.getStationCode().equalsIgnoreCase(fromCode) && srcStop == null)
                srcStop = stop;
            if (stop.getStationCode().equalsIgnoreCase(toCode) && dstStop == null)
                dstStop = stop;
        }

        if (srcStop == null || dstStop == null) return null;
        if (srcStop.getStopSequence() >= dstStop.getStopSequence()) return null;

        // Duration
        Integer durationMins = calcDuration(
                srcStop.getDepartureTime(), srcStop.getDayNumber(),
                dstStop.getArrivalTime(), dstStop.getDayNumber());

        // Running days
        List<String> runningDayNames = parseRunningDays(ts.getRunningDays());
        Boolean runsOnDate = date != null ? checkRunsOnDate(ts.getRunningDays(), date) : null;

        // Classes
        List<String> classes = ts.getAvailableClasses() != null
                ? Arrays.asList(ts.getAvailableClasses().split(","))
                : null;

        // Bookable flag — check if local Train entity exists with same number
        boolean bookable = trainRepo.findByTrainNumber(ts.getTrainNumber()).isPresent();
        Long bookableId = bookable
                ? trainRepo.findByTrainNumber(ts.getTrainNumber()).map(t -> t.getId()).orElse(null)
                : null;

        return TimetableSearchResult.builder()
                .trainNumber(ts.getTrainNumber())
                .trainName(ts.getTrainName())
                .trainType(ts.getTrainType())
                .trainOriginCode(ts.getOriginCode())
                .trainOriginName(ts.getOriginName())
                .trainDestinationCode(ts.getDestinationCode())
                .trainDestinationName(ts.getDestinationName())
                .boardingStationCode(srcStop.getStationCode())
                .boardingStationName(srcStop.getStationName())
                .destinationStationCode(dstStop.getStationCode())
                .destinationStationName(dstStop.getStationName())
                .departureTime(srcStop.getDepartureTime())
                .arrivalTime(dstStop.getArrivalTime())
                .boardingDayNumber(srcStop.getDayNumber())
                .destinationDayNumber(dstStop.getDayNumber())
                .durationMinutes(durationMins)
                .runningDays(runningDayNames)
                .runsOnRequestedDate(runsOnDate)
                .availableClasses(classes)
                .estimatedFare(null)        // not in dataset
                .availabilityNote(null)     // not in dataset
                .dataSource("DATAMEET")
                .dataNote(DATA_NOTE)
                .bookable(bookable)
                .bookableTrainId(bookableId)
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static Integer calcDuration(String depTime, int depDay,
                                         String arrTime, int arrDay) {
        if (depTime == null || arrTime == null) return null;
        try {
            int depMins = timeToMins(depTime) + (depDay - 1) * 24 * 60;
            int arrMins = timeToMins(arrTime) + (arrDay - 1) * 24 * 60;
            int diff = arrMins - depMins;
            if (diff < 0) diff += 24 * 60;  // safety for missing day data
            return diff > 0 ? diff : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static int timeToMins(String t) {
        String[] parts = t.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }

    private static List<String> parseRunningDays(String encoded) {
        if (encoded == null || encoded.isBlank()) return null;
        String[] names = { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" };
        List<String> days = new ArrayList<>();
        for (int i = 1; i <= 7; i++) {
            if (encoded.contains(String.valueOf(i))) days.add(names[i - 1]);
        }
        return days.isEmpty() ? null : days;
    }

    private static Boolean checkRunsOnDate(String encoded, LocalDate date) {
        if (encoded == null || encoded.isBlank()) return null;
        int dow = date.getDayOfWeek().getValue();  // 1=Mon … 7=Sun
        return encoded.contains(String.valueOf(dow));
    }

    // ── Missing-data import guard ─────────────────────────────────────────────

    /** For use from TrainService — import guard message to show to the user. */
    public static final String NO_TIMETABLE_MSG =
            "Timetable database not yet imported. " +
            "POST /api/admin/timetable/import to load the comprehensive Indian Railways dataset, " +
            "or set RAILRADAR_API_KEY for live search.";
}
