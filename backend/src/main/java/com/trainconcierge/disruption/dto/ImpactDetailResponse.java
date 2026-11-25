package com.trainconcierge.disruption.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ImpactDetailResponse(
        Long id,
        Long journeyId,
        Long bookingId,
        String pnr,
        List<String> passengerNames,
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
        int recommendationCount
) {
}
