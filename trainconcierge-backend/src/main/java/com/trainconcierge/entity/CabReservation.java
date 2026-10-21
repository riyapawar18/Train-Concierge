package com.trainconcierge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cab_reservations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CabReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(nullable = false)
    private String cabType;

    @Column(nullable = false)
    private String pickupLocation;

    @Column(nullable = false)
    private String dropLocation;

    @Column(nullable = false)
    private LocalDate pickupDate;

    @Column(nullable = false)
    private String pickupTime;

    @Column(nullable = false)
    private double fare;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ReservationStatus status;

    /** Simulated ride-status (e.g. DRIVER_ASSIGNED → EN_ROUTE → ARRIVED → COMPLETED). */
    @Column(length = 30)
    @Enumerated(EnumType.STRING)
    private RideStatus rideStatus;

    /** Simulated driver pickup ETA in minutes (demo value). */
    @Column
    private Integer pickupEtaMinutes;

    /** Name of the simulated driver (demo). */
    @Column(length = 100)
    private String driverName;

    /** Simulated vehicle registration (demo). */
    @Column(length = 20)
    private String vehicleNumber;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (rideStatus == null) rideStatus = RideStatus.DRIVER_ASSIGNED;
    }

    public enum ReservationStatus {
        PENDING, CONFIRMED, CANCELLED
    }

    public enum RideStatus {
        DRIVER_ASSIGNED,
        EN_ROUTE,
        ARRIVED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }
}
