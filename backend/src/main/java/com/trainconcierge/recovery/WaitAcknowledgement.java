package com.trainconcierge.recovery;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "wait_acknowledgements", uniqueConstraints = @UniqueConstraint(columnNames = {"journey_id", "user_id"}))
public class WaitAcknowledgement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "journey_id", nullable = false)
    private Long journeyId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "acknowledged_at", nullable = false, columnDefinition = "TIMESTAMP DEFAULT now()")
    private LocalDateTime acknowledgedAt = LocalDateTime.now();

    protected WaitAcknowledgement() {}

    public WaitAcknowledgement(Long journeyId, Long userId) {
        this.journeyId = journeyId;
        this.userId = userId;
    }

    public Long getId() { return id; }
    public Long getJourneyId() { return journeyId; }
    public Long getUserId() { return userId; }
    public LocalDateTime getAcknowledgedAt() { return acknowledgedAt; }
}
