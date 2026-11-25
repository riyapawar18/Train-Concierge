package com.trainconcierge.travel.dto;

import com.trainconcierge.travel.SeatStatus;

import java.time.Instant;

public record SeatResponse(
        int seatNo,
        String berthType,
        String berthLabel,
        SeatStatus status,
        Instant heldUntil
) {
}
