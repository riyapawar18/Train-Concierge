package com.trainconcierge.disruption.rules;

import com.trainconcierge.disruption.RecommendationKind;

public record RecommendationCandidate(
        RecommendationKind kind,
        String refTrainNumber,
        Long refBusTripId,
        String refName,
        String classCode,
        String fromStation,
        String toStation,
        java.time.LocalDateTime departureAt,
        java.time.LocalDateTime arrivalAt,
        java.math.BigDecimal fare,
        int seatsAvailable,
        boolean direct,
        com.trainconcierge.catalog.TrainType trainType,
        long durationMinutes
) {

    public String refKey() {
        if (refTrainNumber != null) {
            return refTrainNumber;
        }
        return refBusTripId == null ? "wait" : "bus-" + refBusTripId;
    }
}
