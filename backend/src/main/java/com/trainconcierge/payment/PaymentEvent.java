package com.trainconcierge.payment;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;

@Entity
@Table(name = "payment_events")
@Data
public class PaymentEvent {

    public enum Source {
        USER,
        WEBHOOK,
        VERIFY,
        JOB,
        SYSTEM
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @Column(name = "from_status", nullable = false)
    private String fromStatus;

    @Column(name = "to_status", nullable = false)
    private String toStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Source source;

    @Column(length = 255)
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
