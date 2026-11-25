package com.trainconcierge.travel.dto;

import com.trainconcierge.catalog.TrainType;

import java.util.List;

public record TrainSearchItemResponse(
        String trainNumber,
        String trainName,
        TrainType type,
        SegmentFromResponse from,
        SegmentToResponse to,
        int durationMinutes,
        int distanceKm,
        List<String> runsOn,
        List<ClassAvailabilityResponse> classes
) {
}
