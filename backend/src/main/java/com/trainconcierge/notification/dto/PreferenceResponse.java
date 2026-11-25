package com.trainconcierge.notification.dto;

import com.trainconcierge.notification.UserPreference;

public record PreferenceResponse(
        boolean emailEnabled,
        boolean seatAlertsEnabled,
        boolean disruptionAlertsEnabled,
        boolean announcementsEnabled
) {

    public static PreferenceResponse from(UserPreference preference) {
        return new PreferenceResponse(
                preference.isEmailEnabled(),
                preference.isSeatAlertsEnabled(),
                preference.isDisruptionAlertsEnabled(),
                preference.isAnnouncementsEnabled());
    }
}
