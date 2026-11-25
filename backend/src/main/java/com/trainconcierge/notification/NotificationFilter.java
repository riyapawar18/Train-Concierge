package com.trainconcierge.notification;

import com.trainconcierge.common.error.ApiException;

import java.util.List;
import java.util.Locale;

public enum NotificationFilter {

    ALL(false, null),
    UNREAD(true, null),
    DISRUPTIONS(false, List.of(NotificationType.DISRUPTION,
            NotificationType.DISRUPTION_UPDATED, NotificationType.DISRUPTION_RESOLVED)),
    SEATS(false, List.of(NotificationType.SEAT_ALERT)),
    BOOKINGS(false, List.of(NotificationType.BOOKING_CONFIRMED,
            NotificationType.REBOOKING_CONFIRMED));

    private final boolean unreadOnly;
    private final List<NotificationType> types;

    NotificationFilter(boolean unreadOnly, List<NotificationType> types) {
        this.unreadOnly = unreadOnly;
        this.types = types;
    }

    public boolean isUnreadOnly() {
        return unreadOnly;
    }

    public List<NotificationType> getTypes() {
        return types;
    }

    public static NotificationFilter parse(String value) {
        if (value == null || value.isBlank()) {
            return ALL;
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.validation("filter",
                    "Choose a valid notification filter.");
        }
    }
}
