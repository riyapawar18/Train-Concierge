package com.trainconcierge.controller;

import com.trainconcierge.dto.*;
import com.trainconcierge.security.JwtUtil;
import com.trainconcierge.service.SeatAlertService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seat-alerts")
@RequiredArgsConstructor
public class SeatAlertController {

    private final SeatAlertService seatAlertService;
    private final JwtUtil jwtUtil;

    private Long extractUserId(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (StringUtils.hasText(auth) && auth.startsWith("Bearer ")) {
            return jwtUtil.extractUserId(auth.substring(7));
        }
        throw new RuntimeException("Unauthorized");
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SeatAlertDto>> createAlert(
            @Valid @RequestBody SeatAlertRequest req,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        return ResponseEntity.ok(ApiResponse.success("Seat alert created", seatAlertService.createAlert(userId, req)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SeatAlertDto>>> getAlerts(HttpServletRequest request) {
        Long userId = extractUserId(request);
        return ResponseEntity.ok(ApiResponse.success(seatAlertService.getUserAlerts(userId)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> cancelAlert(
            @PathVariable Long id,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        seatAlertService.cancelAlert(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Seat alert cancelled", null));
    }
}
