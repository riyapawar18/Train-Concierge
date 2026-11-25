package com.trainconcierge.travel.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record SeatHoldRequest(
        @NotBlank String trainNumber,
        @NotNull LocalDate date,
        @NotNull Long coachId,
        @NotNull @Min(1) Integer seatNo
) {
}
