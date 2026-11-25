package com.trainconcierge.travel.dto;

import com.trainconcierge.travel.CoachLayout;

public record CoachAvailabilityResponse(
        Long id,
        String coachNo,
        String classCode,
        CoachLayout layout,
        int total,
        int available,
        int occupied,
        int held
) {
}
