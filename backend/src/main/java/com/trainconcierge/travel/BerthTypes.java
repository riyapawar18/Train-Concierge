package com.trainconcierge.travel;

import java.util.Map;

public final class BerthTypes {

    private static final Map<String, String> LABELS = Map.of(
            "LB", "Lower",
            "MB", "Middle",
            "UB", "Upper",
            "SL", "Side Lower",
            "SU", "Side Upper",
            "WS", "Window",
            "MS", "Middle",
            "AS", "Aisle");

    private BerthTypes() {
    }

    public static String label(String code) {
        if (code == null) {
            return "Seat";
        }
        return LABELS.getOrDefault(code.toUpperCase(), code);
    }
}
