package com.trainconcierge.dto.timetable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Result of a route-stop-based timetable search.
 *
 * <p>Unlike the legacy {@link com.trainconcierge.dto.TrainSearchResult}, this DTO
 * can represent trains that merely pass through the requested stations (intermediate stops),
 * and carries full timetable information where available.
 *
 * <p>All time strings are in "HH:MM" 24-hour format. Missing times are null.
 * Fares and seat availability are null unless provided by a live provider.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableSearchResult {

    // ── Identity ──────────────────────────────────────────────────────────────
    private String trainNumber;
    private String trainName;
    private String trainType;

    // ── Origin / destination of the full train ───────────────────────────────
    private String trainOriginCode;
    private String trainOriginName;
    private String trainDestinationCode;
    private String trainDestinationName;

    // ── Boarding and alighting stops for this search ─────────────────────────
    private String boardingStationCode;
    private String boardingStationName;
    private String destinationStationCode;
    private String destinationStationName;

    /** Departure time at the boarding station ("HH:MM"), or null if unknown. */
    private String departureTime;

    /** Arrival time at the destination station ("HH:MM"), or null if unknown. */
    private String arrivalTime;

    /**
     * Day number at the boarding station relative to train start (1=same day).
     * Needed for overnight journeys.
     */
    private int boardingDayNumber;

    /**
     * Day number at the destination station relative to train start.
     * Greater than boardingDayNumber for overnight travel.
     */
    private int destinationDayNumber;

    /** Journey duration in minutes between the two queried stops. Null if times are missing. */
    private Integer durationMinutes;

    // ── Schedule ──────────────────────────────────────────────────────────────
    /**
     * List of day names this train runs, e.g. ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].
     * Null means the running-day data is not available in the dataset.
     */
    private List<String> runningDays;

    /**
     * Whether the train runs on the specific journey date requested.
     * True if running-day data confirms it. Null if running-day data is unavailable.
     */
    private Boolean runsOnRequestedDate;

    // ── Classes and fare ──────────────────────────────────────────────────────
    /** e.g. ["SL", "3A", "2A", "1A"] — null if not in dataset. */
    private List<String> availableClasses;

    /**
     * Estimated fare in INR. Null unless a fare provider (e.g. RailRadar) supplies it.
     * Never fabricated.
     */
    private Double estimatedFare;

    // ── Availability ──────────────────────────────────────────────────────────
    /**
     * Seat availability message from a live provider.
     * Null when no live provider is configured or the provider did not return this data.
     */
    private String availabilityNote;

    // ── Metadata ─────────────────────────────────────────────────────────────
    /**
     * Data source: "DATAMEET" (static CC0 timetable), "RAILRADAR" (API), "DATABASE" (local DB).
     */
    private String dataSource;

    /**
     * Human-readable note about data freshness.
     * E.g. "Static timetable — schedules may not reflect current operation."
     */
    private String dataNote;

    /**
     * Whether the train can be booked through this application's BookingService.
     * Only true when a matching {@link com.trainconcierge.entity.Train} exists in the local DB.
     */
    private boolean bookable;

    /** Internal DB id of the bookable {@link com.trainconcierge.entity.Train}. Null when not bookable. */
    private Long bookableTrainId;
}
