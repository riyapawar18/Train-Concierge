package com.trainconcierge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainconcierge.dto.timetable.ImportStatusDto;
import com.trainconcierge.entity.*;
import com.trainconcierge.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

/**
 * Imports comprehensive Indian Railways timetable data from the
 * datameet/railways dataset (CC0 public-domain licence, hosted on GitHub).
 *
 * <h2>Data source</h2>
 * <p>github.com/datameet/railways — a community-curated dataset derived from
 * Government of India's Open Data Platform (data.gov.in). Licensed CC0 (public domain).
 * The dataset covers trains available for reservation and includes:
 * <ul>
 *   <li>~550 stations with codes, names, and geo-coordinates.
 *   <li>~10,000+ trains with origin, destination, type, and available classes.
 *   <li>~300,000 route-stop records with arrival/departure times and day numbers.
 * </ul>
 *
 * <h2>Coverage limitations</h2>
 * <ul>
 *   <li>Covers trains available for IRCTC reservation (not suburban/metro).
 *   <li>Timetable reflects a past snapshot; current schedules may differ.
 *   <li>Running-day data is derived from the schedules JSON and may be incomplete.
 *   <li>Fares and live seat availability are NOT included.
 * </ul>
 *
 * <h2>Licensing</h2>
 * The datameet/railways dataset is published under the CC0 1.0 Universal licence,
 * meaning no permission is required for any use. Original data is from data.gov.in.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TimetableImportService {

    // ── GitHub raw URLs for the datameet/railways dataset ────────────────────
    private static final String DATAMEET_STATIONS_URL =
            "https://raw.githubusercontent.com/datameet/railways/master/stations.json";
    private static final String DATAMEET_TRAINS_URL =
            "https://raw.githubusercontent.com/datameet/railways/master/trains.json";
    private static final String DATAMEET_SCHEDULES_URL =
            "https://raw.githubusercontent.com/datameet/railways/master/schedules.json";

    private static final String SOURCE = "DATAMEET";
    private static final int CONNECT_TIMEOUT = 30_000;
    private static final int READ_TIMEOUT    = 120_000;  // large JSON files

    private final StationRepository       stationRepo;
    private final TrainScheduleRepository trainScheduleRepo;
    private final RouteStopRepository     routeStopRepo;
    private final DataSyncLogRepository   syncLogRepo;
    private final ObjectMapper            objectMapper;

    // Prevents concurrent imports
    private final AtomicBoolean running = new AtomicBoolean(false);

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /** Returns the current timetable database statistics and last sync status. */
    public ImportStatusDto getStatus() {
        Optional<DataSyncLog> lastSync = syncLogRepo
                .findTopByDataSourceAndStatusOrderByStartedAtDesc(SOURCE, "SUCCESS");
        Optional<DataSyncLog> lastAny = syncLogRepo
                .findTop10ByOrderByStartedAtDesc().stream().findFirst();

        DataSyncLog log = lastSync.orElse(lastAny.orElse(null));

        return ImportStatusDto.builder()
                .totalTrainSchedules(trainScheduleRepo.count())
                .totalStations(stationRepo.count())
                .totalRouteStops(routeStopRepo.count())
                .lastSyncSource(log != null ? log.getDataSource() : null)
                .lastSyncTime(log != null ? log.getStartedAt() : null)
                .lastSyncStatus(log != null ? log.getStatus() : null)
                .lastSyncTrainsImported(log != null ? log.getTrainsImported() : 0)
                .lastSyncStationsImported(log != null ? log.getStationsImported() : 0)
                .lastSyncRouteStopsImported(log != null ? log.getRouteStopsImported() : 0)
                .lastSyncErrors(log != null ? log.getErrorSummary() : null)
                .importRunning(running.get())
                .dataSourceNote("Data from datameet/railways (CC0). Timetable snapshot — " +
                                "may not reflect current Indian Railways schedules. " +
                                "Fares and seat availability are not included.")
                .build();
    }

    /**
     * Triggers a full import of the datameet/railways dataset.
     * Safe to call repeatedly — uses upsert logic to avoid duplicates.
     * Returns immediately; import runs synchronously in the calling thread
     * (consider running from an @Async method or admin background job for production).
     *
     * @param dryRun if true, parse and validate but do not persist anything
     * @return the created sync log record
     */
    public DataSyncLog runImport(boolean dryRun) {
        if (!running.compareAndSet(false, true)) {
            throw new IllegalStateException("An import is already running. Please wait for it to complete.");
        }

        DataSyncLog syncLog = DataSyncLog.builder()
                .dataSource(SOURCE)
                .startedAt(LocalDateTime.now())
                .status("RUNNING")
                .build();
        syncLog = syncLogRepo.save(syncLog);

        try {
            doImport(syncLog, dryRun);
        } catch (Exception ex) {
            log.error("TimetableImport: fatal error — {}", ex.getMessage(), ex);
            syncLog.setStatus("FAILED");
            syncLog.setCompletedAt(LocalDateTime.now());
            syncLog.setErrorSummary(ex.getMessage());
            syncLog = syncLogRepo.save(syncLog);
        } finally {
            running.set(false);
        }
        return syncLog;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Implementation
    // ─────────────────────────────────────────────────────────────────────────

    private void doImport(DataSyncLog syncLog, boolean dryRun) throws Exception {
        RestTemplate http = buildRestTemplate();

        log.info("TimetableImport: starting import from datameet/railways (dryRun={})", dryRun);

        // Step 1 — Stations
        log.info("TimetableImport: fetching stations from {}", DATAMEET_STATIONS_URL);
        String stationsJson = fetchUrl(http, DATAMEET_STATIONS_URL);
        int stationsImported = importStations(stationsJson, dryRun);
        syncLog.setStationsImported(stationsImported);
        syncLogRepo.save(syncLog);
        log.info("TimetableImport: {} stations processed", stationsImported);

        // Step 2 — Trains
        log.info("TimetableImport: fetching trains from {}", DATAMEET_TRAINS_URL);
        String trainsJson = fetchUrl(http, DATAMEET_TRAINS_URL);
        int trainsImported = importTrains(trainsJson, dryRun);
        syncLog.setTrainsImported(trainsImported);
        syncLogRepo.save(syncLog);
        log.info("TimetableImport: {} trains processed", trainsImported);

        // Step 3 — Schedules (route stops) — largest file
        log.info("TimetableImport: fetching schedules from {}", DATAMEET_SCHEDULES_URL);
        String schedulesJson = fetchUrl(http, DATAMEET_SCHEDULES_URL);
        int stopsImported = importSchedules(schedulesJson, dryRun);
        syncLog.setRouteStopsImported(stopsImported);
        syncLogRepo.save(syncLog);
        log.info("TimetableImport: {} route stops processed", stopsImported);

        syncLog.setStatus("SUCCESS");
        syncLog.setCompletedAt(LocalDateTime.now());
        syncLog.setNotes(String.format(
            "Trains: %d, Stations: %d, RouteStops: %d | Source: datameet/railways CC0",
            trainsImported, stationsImported, stopsImported));
        syncLogRepo.save(syncLog);
        log.info("TimetableImport: DONE — trains={}, stations={}, stops={}",
                trainsImported, stationsImported, stopsImported);
    }

    // ── Stations ────────────────────────────────────────────────────────────

    private int importStations(String json, boolean dryRun) throws Exception {
        JsonNode root = objectMapper.readTree(json);
        JsonNode features = root.path("features");
        int count = 0;
        int rejected = 0;

        for (JsonNode feature : features) {
            JsonNode props = feature.path("properties");
            String code = props.path("code").asText(null);
            String name = props.path("name").asText(null);

            if (code == null || code.isBlank() || code.startsWith("XX-") || code.startsWith("YY-")) {
                rejected++;
                continue;
            }
            code = code.trim().toUpperCase();
            if (name == null || name.isBlank()) {
                rejected++;
                continue;
            }

            Double lat = null, lon = null;
            JsonNode geom = feature.path("geometry");
            if (!geom.isNull() && !geom.isMissingNode()) {
                JsonNode coords = geom.path("coordinates");
                if (coords.isArray() && coords.size() >= 2) {
                    lon = coords.get(0).asDouble();
                    lat = coords.get(1).asDouble();
                }
            }

            if (!dryRun) {
                upsertStation(Station.builder()
                    .stationCode(code)
                    .stationName(name.trim().toUpperCase())
                    .state(nullOrTrim(props.path("state").asText(null)))
                    .zone(nullOrTrim(props.path("zone").asText(null)))
                    .address(nullOrTrim(props.path("address").asText(null)))
                    .latitude(lat)
                    .longitude(lon)
                    .dataSource(SOURCE)
                    .build());
            }
            count++;
        }

        log.debug("Stations: {} imported, {} rejected", count, rejected);
        return count;
    }

    @Transactional
    protected void upsertStation(Station s) {
        stationRepo.findByStationCodeIgnoreCase(s.getStationCode())
            .ifPresentOrElse(existing -> {
                existing.setStationName(s.getStationName());
                existing.setState(s.getState());
                existing.setZone(s.getZone());
                existing.setAddress(s.getAddress());
                if (s.getLatitude() != null) existing.setLatitude(s.getLatitude());
                if (s.getLongitude() != null) existing.setLongitude(s.getLongitude());
                stationRepo.save(existing);
            }, () -> stationRepo.save(s));
    }

    // ── Trains ───────────────────────────────────────────────────────────────

    private int importTrains(String json, boolean dryRun) throws Exception {
        JsonNode root = objectMapper.readTree(json);
        JsonNode features = root.path("features");
        int count = 0;
        int rejected = 0;

        for (JsonNode feature : features) {
            JsonNode props = feature.path("properties");
            String number = props.path("number").asText(null);
            String name   = props.path("name").asText(null);

            if (number == null || number.isBlank() || name == null || name.isBlank()) {
                rejected++;
                continue;
            }
            number = number.trim();

            String fromCode = props.path("from_station_code").asText(null);
            String fromName = props.path("from_station_name").asText(null);
            String toCode   = props.path("to_station_code").asText(null);
            String toName   = props.path("to_station_name").asText(null);
            String type     = props.path("type").asText(null);
            String zone     = props.path("zone").asText(null);

            // Build classes string
            List<String> classes = new ArrayList<>();
            if (props.path("first_ac").asBoolean(false))  classes.add("1A");
            if (props.path("second_ac").asBoolean(false)) classes.add("2A");
            if (props.path("third_ac").asBoolean(false))  classes.add("3A");
            if (props.path("sleeper").asBoolean(false))   classes.add("SL");
            if (props.path("chair_car").asBoolean(false)) classes.add("CC");
            if (props.path("first_class").asBoolean(false)) classes.add("FC");

            if (!dryRun) {
                upsertTrainSchedule(TrainSchedule.builder()
                    .trainNumber(number)
                    .trainName(name.trim())
                    .trainType(nullOrTrim(type))
                    .originCode(fromCode != null ? fromCode.trim().toUpperCase() : null)
                    .originName(fromName != null ? fromName.trim().toUpperCase() : null)
                    .destinationCode(toCode != null ? toCode.trim().toUpperCase() : null)
                    .destinationName(toName != null ? toName.trim().toUpperCase() : null)
                    .availableClasses(classes.isEmpty() ? null : String.join(",", classes))
                    .active(true)
                    .dataSource(SOURCE)
                    .lastUpdated(LocalDateTime.now())
                    .build());
            }
            count++;
        }

        log.debug("Trains: {} imported, {} rejected", count, rejected);
        return count;
    }

    @Transactional
    protected void upsertTrainSchedule(TrainSchedule ts) {
        trainScheduleRepo.findByTrainNumberIgnoreCase(ts.getTrainNumber())
            .ifPresentOrElse(existing -> {
                existing.setTrainName(ts.getTrainName());
                existing.setTrainType(ts.getTrainType());
                existing.setOriginCode(ts.getOriginCode());
                existing.setOriginName(ts.getOriginName());
                existing.setDestinationCode(ts.getDestinationCode());
                existing.setDestinationName(ts.getDestinationName());
                if (ts.getAvailableClasses() != null)
                    existing.setAvailableClasses(ts.getAvailableClasses());
                existing.setActive(true);
                existing.setLastUpdated(LocalDateTime.now());
                trainScheduleRepo.save(existing);
            }, () -> trainScheduleRepo.save(ts));
    }

    // ── Schedules (route stops) ───────────────────────────────────────────────

    private int importSchedules(String json, boolean dryRun) throws Exception {
        JsonNode records = objectMapper.readTree(json);
        if (!records.isArray()) {
            log.warn("Schedules JSON is not an array — skipping");
            return 0;
        }

        // Group stops by train number: Map<trainNumber, List<stop>>
        Map<String, List<JsonNode>> byTrain = new LinkedHashMap<>();
        for (JsonNode rec : records) {
            String trainNo = rec.path("train_number").asText(null);
            if (trainNo == null || trainNo.isBlank()) continue;
            byTrain.computeIfAbsent(trainNo.trim(), k -> new ArrayList<>()).add(rec);
        }

        log.info("TimetableImport: {} unique trains found in schedules", byTrain.size());

        int totalStops = 0;
        int trainsProcessed = 0;
        int trainsSkipped = 0;

        for (Map.Entry<String, List<JsonNode>> entry : byTrain.entrySet()) {
            String trainNo = entry.getKey();
            List<JsonNode> stops = entry.getValue();

            // Find the TrainSchedule for this train
            Optional<TrainSchedule> scheduleOpt = trainScheduleRepo.findByTrainNumberIgnoreCase(trainNo);
            if (scheduleOpt.isEmpty()) {
                // The trains.json didn't have this train — skip
                trainsSkipped++;
                continue;
            }

            TrainSchedule schedule = scheduleOpt.get();

            if (!dryRun) {
                int stopsAdded = upsertRouteStops(schedule, stops);
                totalStops += stopsAdded;
            } else {
                totalStops += stops.size();
            }
            trainsProcessed++;

            if (trainsProcessed % 1000 == 0) {
                log.info("TimetableImport: processed {}/{} trains...", trainsProcessed, byTrain.size());
            }
        }

        log.info("TimetableImport: schedules — {} trains processed, {} skipped, {} stops",
                trainsProcessed, trainsSkipped, totalStops);
        return totalStops;
    }

    @Transactional
    protected int upsertRouteStops(TrainSchedule schedule, List<JsonNode> stops) {
        // Delete existing stops for this train (full replace per import run)
        routeStopRepo.deleteByTrainScheduleId(schedule.getId());

        int seq = 1;
        int added = 0;
        for (JsonNode stop : stops) {
            String code = stop.path("station_code").asText(null);
            if (code == null || code.isBlank()) continue;

            String arr = normaliseTime(stop.path("arrival").asText(null));
            String dep = normaliseTime(stop.path("departure").asText(null));
            int day = stop.path("day").asInt(1);
            if (day < 1) day = 1;

            RouteStop rs = RouteStop.builder()
                    .trainSchedule(schedule)
                    .stopSequence(seq++)
                    .stationCode(code.trim().toUpperCase())
                    .stationName(nullOrTrim(stop.path("station_name").asText(null)))
                    .arrivalTime(arr)
                    .departureTime(dep)
                    .dayNumber(day)
                    .build();
            routeStopRepo.save(rs);
            added++;
        }
        return added;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private String fetchUrl(RestTemplate http, String url) {
        log.debug("TimetableImport: GET {}", url);
        ResponseEntity<String> resp = http.getForEntity(url, String.class);
        if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
            throw new RuntimeException("Failed to fetch " + url + " — status: " + resp.getStatusCode());
        }
        log.debug("TimetableImport: received {} bytes from {}", resp.getBody().length(), url);
        return resp.getBody();
    }

    private static String normaliseTime(String t) {
        if (t == null || t.isBlank() || t.equalsIgnoreCase("None") || t.equalsIgnoreCase("null"))
            return null;
        t = t.trim();
        // "HH:MM:SS" → "HH:MM"
        if (t.length() >= 5 && t.charAt(2) == ':') return t.substring(0, 5);
        return t;
    }

    private static String nullOrTrim(String s) {
        if (s == null || s.isBlank() || s.equalsIgnoreCase("null")) return null;
        return s.trim();
    }

    private static RestTemplate buildRestTemplate() {
        org.springframework.http.client.SimpleClientHttpRequestFactory f =
            new org.springframework.http.client.SimpleClientHttpRequestFactory();
        f.setConnectTimeout(CONNECT_TIMEOUT);
        f.setReadTimeout(READ_TIMEOUT);
        return new RestTemplate(f);
    }
}
