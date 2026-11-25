package com.trainconcierge.travel.dto;

import java.time.LocalDate;
import java.util.List;

public record SeatMapResponse(
        String trainNumber,
        String trainName,
        LocalDate date,
        String classCode,
        String className,
        CoachAvailabilityResponse coach,
        SeatSummaryResponse classSummary,
        List<SeatResponse> seats
) {
}
