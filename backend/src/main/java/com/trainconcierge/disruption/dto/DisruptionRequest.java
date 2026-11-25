package com.trainconcierge.disruption.dto;

import java.time.LocalDate;

public record DisruptionRequest(
        String trainNumber,
        LocalDate travelDate,
        String type,
        Integer delayMinutes,
        String reason,
        String severity
) {
}
