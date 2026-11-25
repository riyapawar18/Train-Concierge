package com.trainconcierge.travel.dto;

import java.time.LocalDate;
import java.util.List;

public record TrainAvailabilityResponse(
        String trainNumber,
        String trainName,
        LocalDate date,
        List<ClassAvailabilityResponse> classes
) {
}
