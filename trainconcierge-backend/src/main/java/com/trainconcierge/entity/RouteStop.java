package com.trainconcierge.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * One stop in an ordered train route.
 *
 * <p>For the Sahyadri Express (11023) running CSMT→KOP, one record exists
 * for each of its ~28 stations including PUNE and MRJ, with departure/arrival
 * times and the sequential stop number.
 */
@Entity
@Table(name = "route_stops",
       indexes = {
           @Index(name = "idx_rs_train_seq",    columnList = "train_schedule_id, stopSequence"),
           @Index(name = "idx_rs_station_code", columnList = "stationCode"),
           @Index(name = "idx_rs_train_station",columnList = "train_schedule_id, stationCode", unique = true)
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "train_schedule_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private TrainSchedule trainSchedule;

    /** Sequential position in the route (1 = origin, increments per stop). */
    @Column(nullable = false)
    private int stopSequence;

    /** Station code, e.g. "MRJ". */
    @Column(nullable = false, length = 10)
    private String stationCode;

    /** Station name, e.g. "MIRAJ JN". */
    @Column(length = 150)
    private String stationName;

    /**
     * Scheduled arrival time at this stop, stored as "HH:MM" string.
     * Null for the origin terminal (no arrival).
     */
    @Column(length = 8)
    private String arrivalTime;

    /**
     * Scheduled departure time at this stop, stored as "HH:MM" string.
     * Null for the destination terminal (no departure).
     */
    @Column(length = 8)
    private String departureTime;

    /**
     * Day offset from the train's start day.
     * 1 = departs/arrives on the same calendar day as the origin.
     * 2 = arrives the next calendar day. etc.
     */
    @Column(nullable = false)
    @Builder.Default
    private int dayNumber = 1;

    /** Halt duration in minutes; null if not in the dataset. */
    @Column
    private Integer haltMinutes;

    /** Distance from origin in km; null if not in the dataset. */
    @Column
    private Integer distanceFromOriginKm;
}
