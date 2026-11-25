package com.trainconcierge.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_preferences")
public class UserPreference {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "email_enabled", nullable = false)
    private boolean emailEnabled;

    @Column(name = "seat_alerts_enabled", nullable = false)
    private boolean seatAlertsEnabled;

    @Column(name = "disruption_alerts_enabled", nullable = false)
    private boolean disruptionAlertsEnabled;

    @Column(name = "announcements_enabled", nullable = false)
    private boolean announcementsEnabled;

    protected UserPreference() {
    }

    public static UserPreference defaults(Long userId, boolean emailEnabled) {
        UserPreference preference = new UserPreference();
        preference.userId = userId;
        preference.emailEnabled = emailEnabled;
        // Seat alerts are the one category a passenger has to ask for.
        preference.seatAlertsEnabled = false;
        preference.disruptionAlertsEnabled = true;
        preference.announcementsEnabled = true;
        return preference;
    }

    public void update(boolean emailEnabled, boolean seatAlertsEnabled,
                       boolean disruptionAlertsEnabled, boolean announcementsEnabled) {
        this.emailEnabled = emailEnabled;
        this.seatAlertsEnabled = seatAlertsEnabled;
        this.disruptionAlertsEnabled = disruptionAlertsEnabled;
        this.announcementsEnabled = announcementsEnabled;
    }

    public Long getUserId() {
        return userId;
    }

    public boolean isEmailEnabled() {
        return emailEnabled;
    }

    public boolean isSeatAlertsEnabled() {
        return seatAlertsEnabled;
    }

    public boolean isDisruptionAlertsEnabled() {
        return disruptionAlertsEnabled;
    }

    public boolean isAnnouncementsEnabled() {
        return announcementsEnabled;
    }
}
