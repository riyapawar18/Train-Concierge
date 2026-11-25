package com.trainconcierge.recovery.bus;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bus_holds", uniqueConstraints = {@UniqueConstraint(columnNames = {"bus_seat_id", "user_id"})})
public class BusHold {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "bus_seat_id", nullable = false)
    private Long busSeatId;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMP DEFAULT now()")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getBusSeatId() { return busSeatId; }
    public void setBusSeatId(Long busSeatId) { this.busSeatId = busSeatId; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
