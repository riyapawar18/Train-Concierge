package com.trainconcierge.controller;

import com.trainconcierge.dto.*;
import com.trainconcierge.security.JwtUtil;
import com.trainconcierge.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtUtil jwtUtil;

    private Long extractUserId(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (StringUtils.hasText(auth) && auth.startsWith("Bearer ")) {
            return jwtUtil.extractUserId(auth.substring(7));
        }
        throw new RuntimeException("Unauthorized");
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getNotifications(HttpServletRequest request) {
        Long userId = extractUserId(request);
        return ResponseEntity.ok(ApiResponse.success(notificationService.getUserNotifications(userId)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(HttpServletRequest request) {
        Long userId = extractUserId(request);
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", count)));
    }

    @PatchMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<Void>> markAllRead(HttpServletRequest request) {
        Long userId = extractUserId(request);
        notificationService.markAllRead(userId);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", null));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @PathVariable Long id,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        notificationService.markRead(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", null));
    }
}
