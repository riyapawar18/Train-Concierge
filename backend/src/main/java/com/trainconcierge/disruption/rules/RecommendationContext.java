package com.trainconcierge.disruption.rules;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record RecommendationContext(
        Long impactId,
        Long journeyId,
        String trainNumber,
        String trainName,
        LocalDate travelDate,
        LocalDateTime boardingTime,
        LocalDateTime originalArrival,
        LocalDateTime newArrival,
        LocalDateTime disruptionTime,
        LocalDateTime earliestDeparture,
        int delayMinutes,
        int passengerCount,
        String bookedClass,
        BigDecimal originalFare,
        com.trainconcierge.travel.Quota quota,
        boolean cancellation,
        boolean needsHotel,
        long newDurationMinutes,
        String fromStation,
        String fromCity,
        String toStation,
        String toCity
) {
}
