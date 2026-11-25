package com.trainconcierge.catalog.dto;

import com.trainconcierge.catalog.TrainType;

import java.util.List;

public record TrainResponse(
        String number,
        String name,
        TrainType type,
        String sourceCode,
        String sourceName,
        String destinationCode,
        String destinationName,
        String runsOn,
        List<TrainClassResponse> classes,
        List<TrainStopResponse> schedule
) {
}
