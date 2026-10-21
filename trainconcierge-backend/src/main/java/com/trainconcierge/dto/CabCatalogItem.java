package com.trainconcierge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Read-only catalog entry representing a browsable cab option.
 * Used for the cab discovery/search flow (GET /api/cabs/search).
 * These are seeded demo records — availability is simulated.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CabCatalogItem {
    private Long catalogId;
    private String cabType;
    private String vehicleName;
    private int passengerCapacity;
    private int luggageCapacity;
    private double baseFare;
    private double farePerKm;
    private boolean available;
    private String defaultPickupLocation;
    private String city;
    /** Note: this is demo/simulated data. */
    private boolean isDemo;
}
