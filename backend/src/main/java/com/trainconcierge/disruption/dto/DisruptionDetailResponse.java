package com.trainconcierge.disruption.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record DisruptionDetailResponse(
        Long id,
        String trainNumber,
        String trainName,
        LocalDate travelDate,
        String type,
        Integer delayMinutes,
        String reason,
        String severity,
        String status,
        int affectedPassengers,
        int affectedBookings,
        int recommendationCount,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt,
        List<ImpactDetailResponse> impacts
) {
}
