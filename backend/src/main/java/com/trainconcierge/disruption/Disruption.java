package com.trainconcierge.disruption;

import com.trainconcierge.catalog.Train;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "disruptions",
        uniqueConstraints = @UniqueConstraint(name = "uk_disruptions_active",
                columnNames = {"train_number", "travel_date", "active_marker"}))
public class Disruption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "train_number", nullable = false)
    private Train train;

    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DisruptionType type;

    @Column(name = "delay_minutes")
    private Integer delayMinutes;

    @Column(nullable = false, length = 190)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DisruptionSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DisruptionStatus status;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "active_marker")
    private Integer activeMarker;

    protected Disruption() {
    }

    public static Disruption create(Train train, LocalDate travelDate, DisruptionType type,
                                    Integer delayMinutes, String reason,
                                    DisruptionSeverity severity, Long createdBy,
                                    LocalDateTime createdAt) {
        Disruption disruption = new Disruption();
        disruption.train = train;
        disruption.travelDate = travelDate;
        disruption.type = type;
        disruption.delayMinutes = delayMinutes;
        disruption.reason = reason;
        disruption.severity = severity;
        disruption.status = DisruptionStatus.ACTIVE;
        disruption.createdBy = createdBy;
        disruption.createdAt = createdAt;
        disruption.syncActiveMarker();
        return disruption;
    }

    @PrePersist
    @PreUpdate
    void syncActiveMarker() {
        activeMarker = status == DisruptionStatus.ACTIVE ? 1 : null;
    }

    public void update(Integer delayMinutes, String reason) {
        this.delayMinutes = delayMinutes;
        this.reason = reason;
    }

    public void resolve(Long userId, LocalDateTime at) {
        this.status = DisruptionStatus.RESOLVED;
        this.resolvedBy = userId;
        this.resolvedAt = at;
        syncActiveMarker();
    }

    public boolean isActive() {
        return status == DisruptionStatus.ACTIVE;
    }

    public boolean isCancellation() {
        return type == DisruptionType.CANCELLATION;
    }

    public Long getId() {
        return id;
    }

    public Train getTrain() {
        return train;
    }

    public String getTrainNumber() {
        return train.getNumber();
    }

    public LocalDate getTravelDate() {
        return travelDate;
    }

    public DisruptionType getType() {
        return type;
    }

    public Integer getDelayMinutes() {
        return delayMinutes;
    }

    public int getDelayMinutesOrZero() {
        return delayMinutes == null ? 0 : delayMinutes;
    }

    public String getReason() {
        return reason;
    }

    public DisruptionSeverity getSeverity() {
        return severity;
    }

    public DisruptionStatus getStatus() {
        return status;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public Long getResolvedBy() {
        return resolvedBy;
    }

    public long getVersion() {
        return version;
    }

    public Integer getActiveMarker() {
        return activeMarker;
    }
}
