package com.trainconcierge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CabRequest {
    @NotNull
    private Long bookingId;
    @NotBlank
    private String cabType;
    @NotBlank
    private String pickupLocation;
    @NotBlank
    private String dropLocation;
    @NotNull
    private LocalDate pickupDate;
    @NotBlank
    private String pickupTime;
    private double fare;

    // ── Ride experience fields (optional, set by the frontend wizard) ──────
    /** Simulated driver pickup ETA in minutes chosen from the ride-option card. */
    private Integer pickupEtaMinutes;
    /** Simulated driver name (generated client-side for demo). */
    private String driverName;
    /** Simulated vehicle registration number (generated client-side for demo). */
    private String vehicleNumber;
}
