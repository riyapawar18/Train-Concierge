package com.trainconcierge.travel.dto;

import java.time.LocalDate;
import java.util.List;

public record CoachesResponse(
        String trainNumber,
        String trainName,
        LocalDate date,
        String classCode,
        String className,
        List<CoachAvailabilityResponse> coaches
) {
}
