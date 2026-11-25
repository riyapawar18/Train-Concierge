package com.trainconcierge.catalog.dto;

import com.trainconcierge.catalog.TrainSchedule;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public record TrainStopResponse(
        String stationCode,
        String stationName,
        int stopOrder,
        String arrivalTime,
        String departureTime,
        int dayOffset,
        int distanceKm
) {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    public static TrainStopResponse from(TrainSchedule stop) {
        return new TrainStopResponse(
                stop.getStation().getCode(),
                stop.getStation().getName(),
                stop.getStopOrder(),
                format(stop.getArrivalTime()),
                format(stop.getDepartureTime()),
                stop.getDayOffset(),
                stop.getDistanceKm());
    }

    private static String format(LocalTime time) {
        return time == null ? null : TIME_FORMAT.format(time);
    }
}
