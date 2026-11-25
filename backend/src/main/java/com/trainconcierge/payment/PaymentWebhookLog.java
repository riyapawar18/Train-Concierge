package com.trainconcierge.payment;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_webhook_log")
public class PaymentWebhookLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_event_id", nullable = false, unique = true)
    private String providerEventId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt = LocalDateTime.now();

    @Column(nullable = false)
    private String outcome; // APPLIED, DUPLICATE, IGNORED, REJECTED

    // Getters & setters omitted for brevity; Lombok can be added later.
}
