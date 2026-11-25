package com.trainconcierge.admin;

import java.time.LocalDateTime;

public record AuditLogEntry(
        Long id, Long actorUserId, String action,
        String targetType, Long targetId, String details, LocalDateTime createdAt
) {}
