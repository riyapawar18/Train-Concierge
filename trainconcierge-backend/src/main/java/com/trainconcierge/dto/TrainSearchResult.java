package com.trainconcierge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Provider-agnostic train result returned by any {@link com.trainconcierge.provider.TrainDataProvider}.
 *
 * <p>Fields that a provider cannot supply are left null. The frontend must handle nulls gracefully.
 *
 * <p>{@code bookable} is true only when the train exists in our database and can be booked
 * through the existing BookingService. Timetable-only results (from external APIs that do not
 * support live seat reservation) have {@code bookable = false}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainSearchResult {

    // ── Identity ──────────────────────────────────────────────────────────────
    /** Our internal DB id, or null for external-only results. */
    private Long id;
    private String trainNumber;
    private String trainName;
    /** e.g. "Rajdhani", "Shatabdi", "Express", "Passenger" */
    private String trainType;

    // ── Route ────────────────────────────────────────────────────────────────
    private String fromStation;
    private String fromStationCode;
    private String toStation;
    private String toStationCode;
    private LocalDate travelDate;
    private LocalTime departureTime;
    private LocalTime arrivalTime;
    /** Journey duration in minutes, or null if not computable. */
    private Integer durationMinutes;
    /** Days of the week this train runs (e.g. ["Mon","Wed","Fri"]), or null. */
    private List<String> runningDays;

    // ── Availability and price ────────────────────────────────────────────────
    private int availableSeats;
    private int totalSeats;
    private double price;
    /** True = train exists in our DB and can be booked through BookingService. */
    private boolean bookable;

    // ── Status ───────────────────────────────────────────────────────────────
    /** "ON_TIME", "DELAYED", "CANCELLED", or null if unknown. */
    private String status;
    private int delayMinutes;
    private String cancellationReason;

    // ── Metadata ─────────────────────────────────────────────────────────────
    /**
     * Which provider returned this result.
     * "DATABASE" = our own DB. "RAILRADAR" = RailRadar API. etc.
     */
    private String dataSource;
    /**
     * Human-readable note about data freshness or limitations.
     * e.g. "Timetable data — live seat booking not supported via this source."
     */
    private String dataNote;
}
