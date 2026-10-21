package com.trainconcierge.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Represents an Indian Railway station.
 * Data sourced from datameet/railways (CC0 licence) and supplemented
 * via the RailRadar Stations API when a key is configured.
 */
@Entity
@Table(name = "stations",
       indexes = {
           @Index(name = "idx_station_code",   columnList = "stationCode",   unique = true),
           @Index(name = "idx_station_name",   columnList = "stationName"),
           @Index(name = "idx_station_state",  columnList = "state")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Station {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Official IRCTC station code, e.g. "MRJ", "PUNE", "NDLS". Always upper-case. */
    @Column(nullable = false, unique = true, length = 10)
    private String stationCode;

    /** Full station name, e.g. "MIRAJ JN". */
    @Column(nullable = false)
    private String stationName;

    /** Alternate / display name if different from canonical, e.g. "Miraj Junction". */
    @Column(length = 200)
    private String alternateName;

    @Column(length = 100)
    private String state;

    @Column(length = 100)
    private String zone;

    @Column(length = 300)
    private String address;

    /** Latitude (WGS-84), null if not in the dataset. */
    @Column
    private Double latitude;

    /** Longitude (WGS-84), null if not in the dataset. */
    @Column
    private Double longitude;

    /** Which dataset provided this record, e.g. "DATAMEET", "RAILRADAR", "MANUAL". */
    @Column(length = 30)
    private String dataSource;
}
