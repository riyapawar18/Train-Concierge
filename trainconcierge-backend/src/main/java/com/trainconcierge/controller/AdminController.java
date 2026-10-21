package com.trainconcierge.controller;

import com.trainconcierge.dto.*;
import com.trainconcierge.entity.Booking;
import com.trainconcierge.repository.BookingRepository;
import com.trainconcierge.repository.UserRepository;
import com.trainconcierge.service.BookingService;
import com.trainconcierge.service.DisruptionService;
import com.trainconcierge.service.TrainService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final TrainService trainService;
    private final DisruptionService disruptionService;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final BookingService bookingService;

    // --- Train Management ---

    @PostMapping("/trains")
    public ResponseEntity<ApiResponse<TrainDto>> addTrain(@Valid @RequestBody TrainDto dto) {
        return ResponseEntity.ok(ApiResponse.success("Train added", trainService.createTrain(dto)));
    }

    @PutMapping("/trains/{id}")
    public ResponseEntity<ApiResponse<TrainDto>> updateTrain(@PathVariable Long id, @Valid @RequestBody TrainDto dto) {
        return ResponseEntity.ok(ApiResponse.success("Train updated", trainService.updateTrain(id, dto)));
    }

    @DeleteMapping("/trains/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTrain(@PathVariable Long id) {
        trainService.deleteTrain(id);
        return ResponseEntity.ok(ApiResponse.success("Train deleted", null));
    }

    // --- Disruption Simulation ---

    @PostMapping("/disruptions")
    public ResponseEntity<ApiResponse<TrainDto>> simulateDisruption(@Valid @RequestBody DisruptionRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Disruption simulated", disruptionService.simulateDisruption(req)));
    }

    @PostMapping("/disruptions/{trainId}/reset")
    public ResponseEntity<ApiResponse<TrainDto>> resetDisruption(@PathVariable Long trainId) {
        return ResponseEntity.ok(ApiResponse.success("Disruption reset", disruptionService.resetDisruption(trainId)));
    }

    // --- Stats ---

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        long totalBookings = bookingRepository.count();
        long confirmedBookings = bookingRepository.findAll().stream()
                .filter(b -> b.getStatus() == Booking.BookingStatus.CONFIRMED).count();
        long totalUsers = userRepository.count();
        long totalTrains = trainService.getAllTrains().size();

        Map<String, Object> stats = Map.of(
                "totalBookings", totalBookings,
                "confirmedBookings", confirmedBookings,
                "totalUsers", totalUsers,
                "totalTrains", totalTrains
        );
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/bookings")
    public ResponseEntity<ApiResponse<List<BookingDto>>> getAllBookings() {
        List<BookingDto> all = bookingRepository.findAll().stream()
                .map(bookingService::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(all));
    }
}
