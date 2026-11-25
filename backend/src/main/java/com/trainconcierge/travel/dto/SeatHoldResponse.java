package com.trainconcierge.travel.dto;

import java.time.Instant;
import java.time.LocalDate;

public record SeatHoldResponse(
        Long id,
        String trainNumber,
        LocalDate date,
        Long coachId,
        String coachNo,
        int seatNo,
        String berthType,
        String berthLabel,
        String label,
        Instant heldUntil
) {
}
