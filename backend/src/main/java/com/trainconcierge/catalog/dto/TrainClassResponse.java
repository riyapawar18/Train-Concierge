package com.trainconcierge.catalog.dto;

import com.trainconcierge.catalog.TrainClass;

import java.math.BigDecimal;

public record TrainClassResponse(
        String classCode,
        BigDecimal baseFare,
        int totalSeats
) {

    public static TrainClassResponse from(TrainClass trainClass) {
        return new TrainClassResponse(trainClass.getClassCode(), trainClass.getBaseFare(),
                trainClass.getTotalSeats());
    }
}
