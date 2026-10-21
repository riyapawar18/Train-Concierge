package com.trainconcierge.controller;

import com.trainconcierge.dto.*;
import com.trainconcierge.security.JwtUtil;
import com.trainconcierge.service.HotelCabService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HotelCabController {

    private final HotelCabService hotelCabService;
    private final JwtUtil jwtUtil;

    private Long extractUserId(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (StringUtils.hasText(auth) && auth.startsWith("Bearer ")) {
            return jwtUtil.extractUserId(auth.substring(7));
        }
        throw new RuntimeException("Unauthorized");
    }

    @PostMapping("/hotels")
    public ResponseEntity<ApiResponse<HotelDto>> reserveHotel(
            @Valid @RequestBody HotelRequest req,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        return ResponseEntity.ok(ApiResponse.success("Hotel reservation confirmed", hotelCabService.reserveHotel(userId, req)));
    }

    /**
     * Search the demo hotel catalog by destination city.
     * GET /api/hotels/search?city=Delhi
     * Requires authentication (JWT). Returns simulated inventory.
     */
    @GetMapping("/hotels/search")
    public ResponseEntity<ApiResponse<List<HotelCatalogItem>>> searchHotels(
            @RequestParam String city) {
        List<HotelCatalogItem> results = hotelCabService.searchHotelCatalog(city);
        String message = results.isEmpty()
                ? "No hotels found for " + city + ". [Demo data]"
                : results.size() + " hotel(s) found in " + city + " [Demo data — availability is simulated]";
        return ResponseEntity.ok(ApiResponse.success(message, results));
    }

    @GetMapping("/hotels")
    public ResponseEntity<ApiResponse<List<HotelDto>>> getMyHotels(HttpServletRequest request) {
        Long userId = extractUserId(request);
        return ResponseEntity.ok(ApiResponse.success(hotelCabService.getHotelsByUser(userId)));
    }

    @GetMapping("/hotels/booking/{bookingId}")
    public ResponseEntity<ApiResponse<List<HotelDto>>> getHotelsByBooking(@PathVariable Long bookingId) {
        return ResponseEntity.ok(ApiResponse.success(hotelCabService.getHotelsByBooking(bookingId)));
    }

    @DeleteMapping("/hotels/{id}")
    public ResponseEntity<ApiResponse<Void>> cancelHotel(
            @PathVariable Long id,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        hotelCabService.cancelHotel(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Hotel reservation cancelled", null));
    }

    @PostMapping("/cabs")
    public ResponseEntity<ApiResponse<CabDto>> reserveCab(
            @Valid @RequestBody CabRequest req,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        return ResponseEntity.ok(ApiResponse.success("Cab reservation confirmed", hotelCabService.reserveCab(userId, req)));
    }

    /**
     * Search the demo cab catalog by destination city.
     * GET /api/cabs/search?city=Delhi
     * Requires authentication (JWT). Returns simulated cab options.
     */
    @GetMapping("/cabs/search")
    public ResponseEntity<ApiResponse<List<CabCatalogItem>>> searchCabs(
            @RequestParam String city) {
        List<CabCatalogItem> results = hotelCabService.searchCabCatalog(city);
        String message = results.isEmpty()
                ? "No cab options found for " + city + ". [Demo data]"
                : results.size() + " cab option(s) available in " + city + " [Demo data — availability is simulated]";
        return ResponseEntity.ok(ApiResponse.success(message, results));
    }

    @GetMapping("/cabs")
    public ResponseEntity<ApiResponse<List<CabDto>>> getMyCabs(HttpServletRequest request) {
        Long userId = extractUserId(request);
        return ResponseEntity.ok(ApiResponse.success(hotelCabService.getCabsByUser(userId)));
    }

    @GetMapping("/cabs/booking/{bookingId}")
    public ResponseEntity<ApiResponse<List<CabDto>>> getCabsByBooking(@PathVariable Long bookingId) {
        return ResponseEntity.ok(ApiResponse.success(hotelCabService.getCabsByBooking(bookingId)));
    }

    @DeleteMapping("/cabs/{id}")
    public ResponseEntity<ApiResponse<Void>> cancelCab(
            @PathVariable Long id,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        hotelCabService.cancelCab(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Cab reservation cancelled", null));
    }

    /**
     * Advance the simulated ride status to the next stage.
     * PATCH /api/cabs/{id}/ride-status
     * Progression: DRIVER_ASSIGNED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED
     */
    @PatchMapping("/cabs/{id}/ride-status")
    public ResponseEntity<ApiResponse<CabDto>> advanceRideStatus(
            @PathVariable Long id,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Ride status updated", hotelCabService.advanceRideStatus(id, userId)));
    }
}
