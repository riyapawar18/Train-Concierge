package com.trainconcierge.disruption;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public final class ImpactText {

    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);

    private ImpactText() {
    }

    public static String duration(int minutes) {
        int safe = Math.max(0, minutes);
        int hours = safe / 60;
        int rest = safe % 60;
        if (hours == 0) {
            return rest + "m";
        }
        if (rest == 0) {
            return hours + "h";
        }
        return hours + "h " + rest + "m";
    }

    public static String clock(LocalDateTime at) {
        return at == null ? "" : at.format(CLOCK);
    }

    public static String day(LocalDate date) {
        return date == null ? "" : date.format(DAY);
    }

    public static String arrivalClause(LocalDateTime arrival, LocalDate travelDate) {
        if (arrival == null) {
            return "";
        }
        if (arrival.toLocalDate().isAfter(travelDate)) {
            return " at about " + clock(arrival) + " the next day";
        }
        return " at about " + clock(arrival);
    }
}
