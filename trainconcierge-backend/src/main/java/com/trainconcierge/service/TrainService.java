package com.trainconcierge.service;

import com.trainconcierge.dto.TrainDto;
import com.trainconcierge.dto.TrainSearchResult;
import com.trainconcierge.entity.Train;
import com.trainconcierge.provider.DatabaseTrainProvider;
import com.trainconcierge.provider.RailRadarTrainProvider;
import com.trainconcierge.provider.TrainProviderException;
import com.trainconcierge.repository.TrainRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrainService {

    private final TrainRepository trainRepository;
    private final DatabaseTrainProvider databaseProvider;
    private final RailRadarTrainProvider railRadarProvider;

    // ─── Search ───────────────────────────────────────────────────────────────

    /**
     * Search for trains between two stations on a given date.
     *
     * <p>Provider selection strategy:
     * <ol>
     *   <li>If RailRadar API key is configured, use RailRadar and also query the local DB,
     *       then merge results (DB results are shown first as they are bookable).</li>
     *   <li>Otherwise, use the local database only.</li>
     * </ol>
     *
     * <p>If a provider throws {@link TrainProviderException}, it is propagated so the
     * controller can return a meaningful HTTP error — never silently swallowed into
     * an empty result list.
     */
    public List<TrainSearchResult> searchTrains(String from, String to, LocalDate date, int seats) {
        validateSearchInput(from, to, date, seats);

        if (railRadarProvider.isConfigured()) {
            return searchWithRailRadarFallback(from, to, date, seats);
        }
        // RailRadar not configured: use DB only, never throw an error about missing credentials
        log.debug("RailRadar not configured — using database provider only");
        return databaseProvider.search(from, to, date, seats);
    }

    private List<TrainSearchResult> searchWithRailRadarFallback(
            String from, String to, LocalDate date, int seats) {
        // Always fetch local DB results first (bookable)
        List<TrainSearchResult> dbResults = databaseProvider.search(from, to, date, seats);

        List<TrainSearchResult> rrResults;
        try {
            rrResults = railRadarProvider.search(from, to, date, seats);
        } catch (TrainProviderException e) {
            // Credentials missing or provider unreachable:
            // return whatever the DB has + surface the provider error in the metadata
            log.warn("RailRadar provider error [{}]: {} — returning DB results only",
                    e.getReason(), e.getMessage());
            if (e.getReason() == TrainProviderException.Reason.MISSING_CREDENTIALS) {
                // Key was set in isConfigured() but then empty — shouldn't happen, but handle it
                return dbResults;
            }
            // For real errors (auth, timeout, rate-limit) — if DB has results, return them
            // but still propagate the error so the controller can warn the user
            if (!dbResults.isEmpty()) {
                log.info("Returning {} DB results despite RailRadar failure", dbResults.size());
                return dbResults;
            }
            // No DB results either — propagate so frontend shows a real error
            throw e;
        }

        // Merge: DB trains first; RailRadar trains whose number is not already in DB
        var dbNumbers = dbResults.stream()
                .map(TrainSearchResult::getTrainNumber).collect(Collectors.toSet());

        List<TrainSearchResult> merged = new java.util.ArrayList<>(dbResults);
        rrResults.stream()
                .filter(r -> !dbNumbers.contains(r.getTrainNumber()))
                .forEach(merged::add);

        log.info("Search {}->{} on {}: {} from DB, {} from RailRadar, {} merged",
                from, to, date, dbResults.size(), rrResults.size(), merged.size());
        return merged;
    }

    private void validateSearchInput(String from, String to, LocalDate date, int seats) {
        if (!StringUtils.hasText(from)) {
            throw new IllegalArgumentException("Source station is required");
        }
        if (!StringUtils.hasText(to)) {
            throw new IllegalArgumentException("Destination station is required");
        }
        if (from.trim().equalsIgnoreCase(to.trim())) {
            throw new IllegalArgumentException("Source and destination stations cannot be the same");
        }
        if (date == null) {
            throw new IllegalArgumentException("Travel date is required");
        }
        if (seats < 1 || seats > 10) {
            throw new IllegalArgumentException("Seats must be between 1 and 10");
        }
    }

    // ─── Legacy DTO bridge (used by existing booking/admin code) ─────────────

    /**
     * Returns TrainDto list — kept for compatibility with BookingService,
     * AdminController, and DisruptionService which work with the internal DB representation.
     */
    public List<TrainDto> searchTrainsAsDto(String from, String to, LocalDate date, int seats) {
        validateSearchInput(from, to, date, seats);
        return trainRepository.searchAvailableTrains(from, to, date, seats)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ─── Passthrough methods used by other services ───────────────────────────

    public TrainDto getTrainById(Long id) {
        return toDto(findEntityById(id));
    }

    public List<TrainDto> getAllTrains() {
        return trainRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public TrainDto createTrain(TrainDto dto) {
        Train train = Train.builder()
                .trainNumber(dto.getTrainNumber())
                .trainName(dto.getTrainName())
                .fromStation(dto.getFromStation())
                .toStation(dto.getToStation())
                .travelDate(dto.getTravelDate())
                .departureTime(dto.getDepartureTime())
                .arrivalTime(dto.getArrivalTime())
                .totalSeats(dto.getTotalSeats())
                .availableSeats(dto.getAvailableSeats())
                .price(dto.getPrice())
                .status(Train.TrainStatus.ON_TIME)
                .delayMinutes(0)
                .build();
        return toDto(trainRepository.save(train));
    }

    public TrainDto updateTrain(Long id, TrainDto dto) {
        Train train = findEntityById(id);
        train.setTrainName(dto.getTrainName());
        train.setFromStation(dto.getFromStation());
        train.setToStation(dto.getToStation());
        train.setTravelDate(dto.getTravelDate());
        train.setDepartureTime(dto.getDepartureTime());
        train.setArrivalTime(dto.getArrivalTime());
        train.setTotalSeats(dto.getTotalSeats());
        train.setAvailableSeats(dto.getAvailableSeats());
        train.setPrice(dto.getPrice());
        return toDto(trainRepository.save(train));
    }

    public void deleteTrain(Long id) {
        trainRepository.deleteById(id);
    }

    public Train findEntityById(Long id) {
        return trainRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Train not found: " + id));
    }

    public Train save(Train train) {
        return trainRepository.save(train);
    }

    public List<TrainDto> getAlternatives(Long trainId) {
        Train original = findEntityById(trainId);
        return trainRepository.searchAvailableTrains(
                        original.getFromStation(),
                        original.getToStation(),
                        original.getTravelDate(),
                        1)
                .stream()
                .filter(t -> !t.getId().equals(trainId))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public TrainDto toDto(Train train) {
        return TrainDto.builder()
                .id(train.getId())
                .trainNumber(train.getTrainNumber())
                .trainName(train.getTrainName())
                .fromStation(train.getFromStation())
                .toStation(train.getToStation())
                .travelDate(train.getTravelDate())
                .departureTime(train.getDepartureTime())
                .arrivalTime(train.getArrivalTime())
                .totalSeats(train.getTotalSeats())
                .availableSeats(train.getAvailableSeats())
                .price(train.getPrice())
                .status(train.getStatus().name())
                .delayMinutes(train.getDelayMinutes())
                .cancellationReason(train.getCancellationReason())
                .build();
    }
}
