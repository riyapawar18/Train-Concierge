package com.trainconcierge.travel.dto;

import com.trainconcierge.catalog.dto.TrainStopResponse;
import com.trainconcierge.travel.TrainStatus;

import java.time.LocalDate;
import java.util.List;

public record TrainStatusResponse(
        String trainNumber,
        String trainName,
        LocalDate date,
        TrainStatus status,
        int delayMinutes,
        boolean simulated,
        String disruptionHref,
        String disruptionTitle,
        List<TrainStopResponse> schedule
) {
}
