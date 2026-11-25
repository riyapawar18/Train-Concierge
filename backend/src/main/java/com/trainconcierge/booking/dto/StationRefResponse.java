package com.trainconcierge.booking.dto;

import com.trainconcierge.catalog.Station;

public record StationRefResponse(String code, String name, String city) {

    public static StationRefResponse from(Station station) {
        return new StationRefResponse(station.getCode(), station.getName(), station.getCity());
    }
}
