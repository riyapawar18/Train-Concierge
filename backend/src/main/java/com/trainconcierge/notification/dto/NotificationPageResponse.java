package com.trainconcierge.notification.dto;

import java.util.List;

public record NotificationPageResponse(
        List<NotificationResponse> items,
        int page,
        int size,
        long total,
        boolean hasMore
) {
}
