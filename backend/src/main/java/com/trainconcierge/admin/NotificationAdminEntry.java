package com.trainconcierge.admin;

import java.time.LocalDateTime;

public record NotificationAdminEntry(
        Long id, Long userId, String type, String title,
        String channel, String deliveryStatus, String deliveryError,
        LocalDateTime createdAt
) {}
