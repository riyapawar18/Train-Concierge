package com.trainconcierge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CabDto {
    private Long id;
    private Long bookingId;
    private String cabType;
    private String pickupLocation;
    private String dropLocation;
    private LocalDate pickupDate;
    private String pickupTime;
    private double fare;
    private String status;
    private LocalDateTime createdAt;

    // ── Ride experience fields ─────────────────────────────────────────────
    /** Simulated ride-status (DRIVER_ASSIGNED / EN_ROUTE / ARRIVED / IN_PROGRESS / COMPLETED / CANCELLED). */
    private String rideStatus;
    /** Simulated driver pickup ETA in minutes (demo). */
    private Integer pickupEtaMinutes;
    /** Simulated driver name (demo). */
    private String driverName;
    /** Simulated vehicle registration number (demo). */
    private String vehicleNumber;
}
