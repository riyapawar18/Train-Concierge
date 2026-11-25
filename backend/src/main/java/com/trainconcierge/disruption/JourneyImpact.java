package com.trainconcierge.disruption;

import com.trainconcierge.booking.Booking;
import com.trainconcierge.booking.Journey;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;

@Entity
@Table(name = "journey_impacts",
        uniqueConstraints = @UniqueConstraint(name = "uk_journey_impacts_disruption_booking",
                columnNames = {"disruption_id", "booking_id"}))
public class JourneyImpact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "disruption_id", nullable = false)
    private Disruption disruption;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "journey_id", nullable = false)
    private Journey journey;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(name = "original_arrival", nullable = false)
    private LocalDateTime originalArrival;

    @Column(name = "new_arrival")
    private LocalDateTime newArrival;

    @Column(name = "delay_minutes", nullable = false)
    private int delayMinutes;

    @Column(name = "missed_connection", nullable = false)
    private boolean missedConnection;

    @Column(nullable = false)
    private boolean overnight;

    @Column(name = "needs_hotel", nullable = false)
    private boolean needsHotel;

    @Enumerated(EnumType.STRING)
    @Column(name = "impact_level", nullable = false, length = 20)
    private ImpactLevel impactLevel;

    @Column(nullable = false, length = 300)
    private String summary;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected JourneyImpact() {
    }

    public static JourneyImpact create(Disruption disruption, Journey journey, Booking booking,
                                       LocalDateTime createdAt) {
        JourneyImpact impact = new JourneyImpact();
        impact.disruption = disruption;
        impact.journey = journey;
        impact.booking = booking;
        impact.createdAt = createdAt;
        return impact;
    }

    public void update(LocalDateTime originalArrival, LocalDateTime newArrival, int delayMinutes,
                       boolean missedConnection, boolean overnight, boolean needsHotel,
                       ImpactLevel impactLevel, String summary) {
        this.originalArrival = originalArrival;
        this.newArrival = newArrival;
        this.delayMinutes = delayMinutes;
        this.missedConnection = missedConnection;
        this.overnight = overnight;
        this.needsHotel = needsHotel;
        this.impactLevel = impactLevel;
        this.summary = summary;
    }

    public Long getId() {
        return id;
    }

    public Disruption getDisruption() {
        return disruption;
    }

    public Journey getJourney() {
        return journey;
    }

    public Booking getBooking() {
        return booking;
    }

    public LocalDateTime getOriginalArrival() {
        return originalArrival;
    }

    public LocalDateTime getNewArrival() {
        return newArrival;
    }

    public int getDelayMinutes() {
        return delayMinutes;
    }

    public boolean isMissedConnection() {
        return missedConnection;
    }

    public boolean isOvernight() {
        return overnight;
    }

    public boolean isNeedsHotel() {
        return needsHotel;
    }

    public ImpactLevel getImpactLevel() {
        return impactLevel;
    }

    public String getSummary() {
        return summary;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
