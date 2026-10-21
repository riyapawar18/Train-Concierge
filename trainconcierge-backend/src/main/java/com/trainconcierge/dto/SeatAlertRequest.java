package com.trainconcierge.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class SeatAlertRequest {
    @NotBlank
    private String fromStation;
    @NotBlank
    private String toStation;
    @NotNull
    private LocalDate travelDate;
    @Min(1)
    private int seatsRequired;
}
