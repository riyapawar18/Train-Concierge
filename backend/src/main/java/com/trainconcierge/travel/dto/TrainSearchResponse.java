package com.trainconcierge.travel.dto;

import java.time.LocalDate;
import java.util.List;

public record TrainSearchResponse(
        SearchStationResponse from,
        SearchStationResponse to,
        LocalDate date,
        String quota,
        int count,
        List<TrainSearchItemResponse> results,
        List<StationOptionResponse> fromStations,
        List<StationOptionResponse> toStations,
        List<ClassOptionResponse> classes
) {
}
