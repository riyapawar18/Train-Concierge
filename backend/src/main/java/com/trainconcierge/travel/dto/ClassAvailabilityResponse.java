package com.trainconcierge.travel.dto;

import com.trainconcierge.travel.AvailabilityLevel;

import java.math.BigDecimal;

public record ClassAvailabilityResponse(
        String code,
        String name,
        BigDecimal fare,
        BigDecimal baseFare,
        int available,
        int total,
        String label,
        AvailabilityLevel level
) {
}
