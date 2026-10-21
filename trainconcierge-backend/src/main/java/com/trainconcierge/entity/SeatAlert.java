package com.trainconcierge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "seat_alerts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String fromStation;

    @Column(nullable = false)
    private String toStation;

    @Column(nullable = false)
    private LocalDate travelDate;

    @Column(nullable = false)
    private int seatsRequired;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private AlertStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime triggeredAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum AlertStatus {
        ACTIVE, TRIGGERED, CANCELLED
    }
}
