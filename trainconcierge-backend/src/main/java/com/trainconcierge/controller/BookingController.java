package com.trainconcierge.controller;

import com.trainconcierge.dto.*;
import com.trainconcierge.security.JwtUtil;
import com.trainconcierge.service.BookingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final JwtUtil jwtUtil;

    private Long extractUserId(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (StringUtils.hasText(auth) && auth.startsWith("Bearer ")) {
            return jwtUtil.extractUserId(auth.substring(7));
        }
        throw new RuntimeException("Unauthorized");
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BookingDto>> createBooking(
            @Valid @RequestBody BookingRequest bookingRequest,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        BookingDto dto = bookingService.createBooking(userId, bookingRequest);
        return ResponseEntity.ok(ApiResponse.success("Booking confirmed", dto));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BookingDto>>> getMyBookings(HttpServletRequest request) {
        Long userId = extractUserId(request);
        return ResponseEntity.ok(ApiResponse.success(bookingService.getUserBookings(userId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingDto>> getBooking(
            @PathVariable Long id,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        return ResponseEntity.ok(ApiResponse.success(bookingService.getBookingById(id, userId)));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<BookingDto>> cancelBooking(
            @PathVariable Long id,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        return ResponseEntity.ok(ApiResponse.success("Booking cancelled", bookingService.cancelBooking(id, userId)));
    }

    @PostMapping("/rebook")
    public ResponseEntity<ApiResponse<BookingDto>> rebook(
            @Valid @RequestBody RebookRequest rebookRequest,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        return ResponseEntity.ok(ApiResponse.success("Rebooking confirmed", bookingService.rebookPassenger(userId, rebookRequest)));
    }
}
