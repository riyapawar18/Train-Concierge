package com.trainconcierge.notification.dto;

import jakarta.validation.constraints.NotNull;

public record PreferenceRequest(
        @NotNull Boolean emailEnabled,
        @NotNull Boolean seatAlertsEnabled,
        @NotNull Boolean disruptionAlertsEnabled,
        @NotNull Boolean announcementsEnabled
) {
}
