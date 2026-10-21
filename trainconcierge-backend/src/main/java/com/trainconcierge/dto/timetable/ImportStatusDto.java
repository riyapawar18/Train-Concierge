package com.trainconcierge.dto.timetable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Summary of the current state of the timetable database and the last import run.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportStatusDto {
    private long totalTrainSchedules;
    private long totalStations;
    private long totalRouteStops;
    private String lastSyncSource;
    private LocalDateTime lastSyncTime;
    private String lastSyncStatus;
    private int lastSyncTrainsImported;
    private int lastSyncStationsImported;
    private int lastSyncRouteStopsImported;
    private String lastSyncErrors;
    private boolean importRunning;
    private String dataSourceNote;
}
