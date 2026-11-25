package com.trainconcierge.travel;

import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class TravelClasses {

    public static final List<String> CODES = List.of("1A", "2A", "3A", "3E", "SL", "CC", "EC", "EV", "2S");

    private static final Map<String, String> NAMES = Map.of(
            "1A", "AC First Class",
            "2A", "AC 2 Tier",
            "3A", "AC 3 Tier",
            "3E", "AC 3 Economy",
            "SL", "Sleeper",
            "CC", "AC Chair Car",
            "EC", "Executive Chair Car",
            "EV", "Vistadome AC",
            "2S", "Second Sitting");

    private TravelClasses() {
    }

    public static String name(String code) {
        String normalized = normalize(code);
        return NAMES.getOrDefault(normalized, normalized);
    }

    public static int order(String code) {
        int index = CODES.indexOf(normalize(code));
        return index < 0 ? CODES.size() : index;
    }

    public static boolean isKnown(String code) {
        return NAMES.containsKey(normalize(code));
    }

    public static String normalize(String code) {
        return code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    }
}
