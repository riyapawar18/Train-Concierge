package com.trainconcierge.catalog.dto;

import com.trainconcierge.catalog.Station;

import java.math.BigDecimal;

public record StationResponse(
        String code,
        String name,
        String city,
        String state,
        BigDecimal latitude,
        BigDecimal longitude
) {

    public static StationResponse from(Station station) {
        return new StationResponse(station.getCode(), station.getName(), station.getCity(),
                station.getState(), station.getLatitude(), station.getLongitude());
    }
}
