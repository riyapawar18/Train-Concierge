package com.trainconcierge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Read-only catalog entry representing a browsable hotel option.
 * Used for the hotel discovery/search flow (GET /api/hotels/search).
 * These are seeded demo records — availability is simulated.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelCatalogItem {
    private Long catalogId;
    private String hotelName;
    private String city;
    private String locality;
    private String address;
    private double pricePerNight;
    private double rating;
    private int reviewCount;
    private String roomType;
    private int maxOccupancy;
    private List<String> amenities;
    private boolean available;
    private String imageUrl;
    /** Note: this is demo/simulated data. */
    private boolean isDemo;
}
