package com.trainconcierge.booking.dto;

import java.time.LocalDateTime;
import java.util.List;

public record JourneyListResponse(
        List<JourneyListItemResponse> items,
        int page,
        int size,
        long totalItems,
        int totalPages,
        String sort,
        String status,
        LocalDateTime serverTime
) {
}
