package com.trainconcierge.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RebookRequest {
    @NotNull
    private Long originalBookingId;
    @NotNull
    private Long newTrainId;
    private int numberOfSeats;
}
