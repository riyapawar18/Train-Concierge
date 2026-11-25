package com.trainconcierge.booking;

import java.util.Locale;

public enum Gender {
    MALE,
    FEMALE,
    OTHER;

    public static Gender parse(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
