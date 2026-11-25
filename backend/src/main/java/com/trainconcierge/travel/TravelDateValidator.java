package com.trainconcierge.travel;

import com.trainconcierge.common.error.ApiException;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class TravelDateValidator {

    private static final int MAX_DAYS_AHEAD = 120;

    public LocalDate requireValid(LocalDate date) {
        if (date == null) {
            throw ApiException.validation("date", "Choose a travel date.");
        }
        LocalDate today = LocalDate.now();
        if (date.isBefore(today)) {
            throw ApiException.validation("date", "Travel date cannot be in the past.");
        }
        if (date.isAfter(today.plusDays(MAX_DAYS_AHEAD))) {
            throw ApiException.validation("date",
                    "Travel date must be within the next " + MAX_DAYS_AHEAD + " days.");
        }
        return date;
    }
}
