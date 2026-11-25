package com.trainconcierge.disruption.dto;

import java.time.LocalDateTime;

public record JourneyImpactResponse(
        Long id,
        Long disruptionId,
        String disruptionStatus,
        String disruptionType,
        String severity,
        String trainNumber,
        String trainName,
        String fromCode,
        String fromName,
        String toCode,
        String toName,
        LocalDateTime originalArrival,
        LocalDateTime newArrival,
        int delayMinutes,
        boolean missedConnection,
        boolean overnight,
        boolean needsHotel,
        String impactLevel,
        String summary,
        String refundNote
) {
}
