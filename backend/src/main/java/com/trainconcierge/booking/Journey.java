package com.trainconcierge.booking;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "journeys")
public class Journey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @Column(length = 120)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private JourneyStatus storedStatus;

    @Column(name = "disruption_id")
    private Long disruptionId;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "flagged", nullable = false, columnDefinition = "boolean default false")
    private boolean flagged = false;

    protected Journey() {
    }

    public static Journey create(Long userId, Booking booking, String title, String notes,
                                 LocalDateTime createdAt) {
        Journey journey = new Journey();
        journey.userId = userId;
        journey.booking = booking;
        journey.title = title;
        journey.notes = notes;
        journey.storedStatus = JourneyStatus.UPCOMING;
        journey.createdAt = createdAt;
        return journey;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void rename(String title) {
        this.title = title;
    }

    public void updateNotes(String notes) {
        this.notes = notes;
    }

    public void cancel() {
        this.storedStatus = JourneyStatus.CANCELLED;
    }

    public void markDisrupted(Long disruptionId) {
        this.storedStatus = JourneyStatus.DISRUPTED;
        this.disruptionId = disruptionId;
    }

    public void markRebooked() {
        this.storedStatus = JourneyStatus.REBOOKED;
    }

    public void setFlagged(boolean flagged) {
        this.flagged = flagged;
    }

    public boolean isFlagged() {
        return flagged;
    }

    public void restoreAfterResolution() {
        if (storedStatus == JourneyStatus.DISRUPTED) {
            storedStatus = JourneyStatus.UPCOMING;
            disruptionId = null;
        }
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Booking getBooking() {
        return booking;
    }

    public String getTitle() {
        return title;
    }

    public JourneyStatus getStoredStatus() {
        return storedStatus;
    }

    public Long getDisruptionId() {
        return disruptionId;
    }

    public String getNotes() {
        return notes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
