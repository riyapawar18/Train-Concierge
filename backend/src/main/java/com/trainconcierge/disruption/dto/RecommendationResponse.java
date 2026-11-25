package com.trainconcierge.disruption.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record RecommendationResponse(
        Long id,
        String kind,
        String refTrainNumber,
        String refName,
        Long refBusTripId,
        String classCode,
        String className,
        String fromStation,
        String fromName,
        String toStation,
        String toName,
        LocalDateTime departureAt,
        LocalDateTime arrivalAt,
        BigDecimal fare,
        int seatsAvailable,
        int score,
        int rank,
        boolean recommended,
        List<String> reasons,
        List<String> warnings,
        boolean active
) {
}
