package com.trainconcierge.controller;

import com.trainconcierge.dto.ApiResponse;
import com.trainconcierge.dto.TrainDto;
import com.trainconcierge.dto.TrainSearchResult;
import com.trainconcierge.provider.TrainProviderException;
import com.trainconcierge.service.TrainService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/trains")
@RequiredArgsConstructor
@Slf4j
public class TrainController {

    private final TrainService trainService;

    /**
     * Search for available trains.
     *
     * GET /api/trains/search?from=Mumbai&to=Delhi&date=2026-10-20&seats=2
     *
     * Returns {@link TrainSearchResult} list (provider-agnostic).
     * Distinguishes between:
     *   - 200 with empty array  → valid search, zero matching trains
     *   - 400                   → invalid input (same station, bad date, etc.)
     *   - 401                   → provider auth failure
     *   - 429                   → provider rate limit
     *   - 503                   → provider timeout or unavailable
     *   - 500                   → internal error
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<TrainSearchResult>>> search(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "1") int seats) {

        try {
            List<TrainSearchResult> results = trainService.searchTrains(from, to, date, seats);
            String msg = results.isEmpty()
                    ? "No trains found for this route and date."
                    : results.size() + " train(s) found.";
            return ResponseEntity.ok(ApiResponse.success(msg, results));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));

        } catch (TrainProviderException e) {
            log.warn("Train search provider error [{}]: {}", e.getReason(), e.getMessage());
            HttpStatus status = switch (e.getReason()) {
                case MISSING_CREDENTIALS, AUTHENTICATION_FAILURE -> HttpStatus.UNAUTHORIZED;
                case RATE_LIMITED                                  -> HttpStatus.TOO_MANY_REQUESTS;
                case PROVIDER_TIMEOUT, PROVIDER_ERROR              -> HttpStatus.SERVICE_UNAVAILABLE;
                default                                            -> HttpStatus.INTERNAL_SERVER_ERROR;
            };
            return ResponseEntity.status(status)
                    .body(ApiResponse.error(e.getMessage()));

        } catch (Exception e) {
            log.error("Train search unexpected error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("An unexpected error occurred. Please try again."));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TrainDto>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(trainService.getTrainById(id)));
    }

    @GetMapping("/{id}/alternatives")
    public ResponseEntity<ApiResponse<List<TrainDto>>> getAlternatives(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(trainService.getAlternatives(id)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<TrainDto>>> getAllTrains() {
        return ResponseEntity.ok(ApiResponse.success(trainService.getAllTrains()));
    }
}
