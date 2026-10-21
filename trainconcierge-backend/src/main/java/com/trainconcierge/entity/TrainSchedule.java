package com.trainconcierge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Comprehensive train master record.
 *
 * <p>This table stores the timetable information imported from external datasets
 * (datameet/railways CC0, RailRadar API). It is separate from the {@link Train}
 * booking entity so that bookings and live operations are not affected by timetable updates.
 *
 * <p>Each {@code TrainSchedule} has an ordered list of {@link RouteStop} records
 * that represent the complete station sequence.
 */
@Entity
@Table(name = "train_schedules",
       indexes = {
           @Index(name = "idx_ts_number",  columnList = "trainNumber", unique = true),
           @Index(name = "idx_ts_name",    columnList = "trainName"),
           @Index(name = "idx_ts_origin",  columnList = "originCode"),
           @Index(name = "idx_ts_dest",    columnList = "destinationCode"),
           @Index(name = "idx_ts_source",  columnList = "dataSource"),
           @Index(name = "idx_ts_active",  columnList = "active")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Official 5-digit train number (e.g. "11023"). */
    @Column(nullable = false, unique = true, length = 10)
    private String trainNumber;

    @Column(nullable = false)
    private String trainName;

    /** Train type: EXP, RAJ, SHT, PASS, MEM, etc. */
    @Column(length = 20)
    private String trainType;

    /** Origin station code, e.g. "CSTM". */
    @Column(length = 10)
    private String originCode;

    /** Origin station name. */
    @Column(length = 150)
    private String originName;

    /** Destination station code, e.g. "KOP". */
    @Column(length = 10)
    private String destinationCode;

    /** Destination station name. */
    @Column(length = 150)
    private String destinationName;

    /**
     * Comma-separated running days: "1,2,3,4,5,6,7" where 1=Monday.
     * "1234567" means daily. Null means unknown.
     */
    @Column(length = 20)
    private String runningDays;

    /** Available travel classes, comma-separated (e.g. "SL,3A,2A,1A"). */
    @Column(length = 60)
    private String availableClasses;

    /** Whether this train is currently active in the dataset. */
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Source dataset: "DATAMEET" (datameet/railways CC0),
     * "RAILRADAR" (RailRadar API timetable), "MANUAL" (admin-entered).
     */
    @Column(length = 20, nullable = false)
    private String dataSource;

    /** When this record was last imported or refreshed. */
    @Column
    private LocalDateTime lastUpdated;

    /** Total distance in km, if provided by the dataset. */
    @Column
    private Integer distanceKm;

    /** Ordered stop list for this train. */
    @OneToMany(mappedBy = "trainSchedule",
               cascade = CascadeType.ALL,
               fetch = FetchType.LAZY,
               orphanRemoval = true)
    @OrderBy("stopSequence ASC")
    @Builder.Default
    private List<RouteStop> stops = new ArrayList<>();
}
