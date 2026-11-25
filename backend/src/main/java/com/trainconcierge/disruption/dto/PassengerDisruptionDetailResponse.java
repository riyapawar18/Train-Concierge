package com.trainconcierge.disruption.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PassengerDisruptionDetailResponse(
        Long id,
        String trainNumber,
        String trainName,
        LocalDate travelDate,
        String type,
        Integer delayMinutes,
        String reason,
        String severity,
        String status,
        LocalDateTime createdAt,
        List<PassengerDisruptionResponse> impacts
) {
}
