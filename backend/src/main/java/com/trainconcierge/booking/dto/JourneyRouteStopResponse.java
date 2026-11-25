package com.trainconcierge.booking.dto;

public record JourneyRouteStopResponse(
        String stationCode,
        String stationName,
        String arrivalTime,
        String departureTime,
        int dayOffset,
        int distanceKm,
        boolean boarding,
        boolean alighting
) {
}
