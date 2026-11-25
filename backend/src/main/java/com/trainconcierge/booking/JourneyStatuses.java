package com.trainconcierge.booking;

import java.time.LocalDateTime;

public final class JourneyStatuses {

    private JourneyStatuses() {
    }

    /**
     * UPCOMING, ACTIVE and COMPLETED are derived from the clock; the other states are
     * stored explicitly when the passenger cancels or a later phase disrupts or rebooks.
     */
    public static JourneyStatus effective(JourneyStatus stored, LocalDateTime boardingTime,
                                          LocalDateTime arrivalTime, LocalDateTime now) {
        if (stored == JourneyStatus.CANCELLED || stored == JourneyStatus.DISRUPTED
                || stored == JourneyStatus.REBOOKED || stored == JourneyStatus.COMPLETED) {
            return stored;
        }
        if (now.isBefore(boardingTime)) {
            return JourneyStatus.UPCOMING;
        }
        if (now.isAfter(arrivalTime)) {
            return JourneyStatus.COMPLETED;
        }
        return JourneyStatus.ACTIVE;
    }
}
