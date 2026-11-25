package com.trainconcierge.disruption.dto;

public record DisruptionPreviewResponse(
        int affectedPassengers,
        int confirmedBookings,
        String message
) {
}
