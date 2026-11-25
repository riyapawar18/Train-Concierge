package com.trainconcierge.travel;

import java.time.LocalDate;

public record TrainSearchCriteria(
        String from,
        String to,
        LocalDate date,
        String classCodes,
        Quota quota,
        String types,
        Integer depFrom,
        Integer depTo,
        Integer arrFrom,
        Integer arrTo,
        String fromStations,
        String toStations,
        SearchSort sort
) {
}
