package com.trainconcierge.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BookingRequest {
    @NotNull
    private Long trainId;

    @Min(1)
    private int numberOfSeats;
}
