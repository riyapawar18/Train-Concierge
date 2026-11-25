package com.trainconcierge.booking.dto;

public record JourneySummaryResponse(
        int upcoming,
        int active,
        int needingAttention,
        int completed,
        int cancelled,
        int disruptions,
        int total
) {
}
