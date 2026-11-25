package com.trainconcierge.notification.dto;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        String type,
        String title,
        String body,
        String linkPath,
        String entityType,
        Long entityId,
        boolean read,
        LocalDateTime createdAt
) {
}
