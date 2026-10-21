package com.trainconcierge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DisruptionRequest {
    @NotNull
    private Long trainId;
    @NotBlank
    private String type; // "DELAY" or "CANCEL"
    private int delayMinutes;
    private String reason;
}
