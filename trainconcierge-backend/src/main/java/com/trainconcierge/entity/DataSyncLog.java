package com.trainconcierge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Tracks the status and results of each data-import / synchronisation run.
 */
@Entity
@Table(name = "data_sync_logs",
       indexes = {
           @Index(name = "idx_dsl_source",     columnList = "dataSource"),
           @Index(name = "idx_dsl_started_at", columnList = "startedAt")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DataSyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** e.g. "DATAMEET", "RAILRADAR" */
    @Column(nullable = false, length = 30)
    private String dataSource;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    @Column
    private LocalDateTime completedAt;

    /** RUNNING, SUCCESS, PARTIAL, FAILED */
    @Column(nullable = false, length = 20)
    private String status;

    @Column
    private int trainsImported;

    @Column
    private int trainsUpdated;

    @Column
    private int stationsImported;

    @Column
    private int routeStopsImported;

    @Column
    private int recordsRejected;

    @Column(columnDefinition = "TEXT")
    private String errorSummary;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
