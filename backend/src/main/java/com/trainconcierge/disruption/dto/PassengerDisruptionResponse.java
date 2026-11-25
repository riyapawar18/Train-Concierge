package com.trainconcierge.disruption.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PassengerDisruptionResponse(
        Long id,
        Long impactId,
        Long journeyId,
        String trainNumber,
        String trainName,
        LocalDate travelDate,
        String fromCode,
        String fromName,
        String toCode,
        String toName,
        String type,
        Integer delayMinutes,
        String reason,
        String severity,
        String status,
        String impactLevel,
        String summary,
        LocalDateTime originalArrival,
        LocalDateTime newArrival,
        boolean missedConnection,
        boolean overnight,
        boolean needsHotel,
        String journeyStatus,
        LocalDateTime createdAt
) {
}
