package com.trainconcierge.payment;

import lombok.Data;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * JPA entity representing a payment.
 */
@Entity
@Table(name = "payments")
@Data
public class Payment {

    public enum Status {
        INITIATED,
        PENDING,
        SUCCESS,
        FAILED,
        EXPIRED
    }

    public enum VerificationLevel {
        SIMULATED,
        PROVIDER_VERIFIED,
        SELF_REPORTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String purpose; // e.g., BOOKING, REBOOKING, HOTEL

    @Column(name = "reference_type", nullable = false)
    private String referenceType;

    @Column(name = "reference_id", nullable = false)
    private Long referenceId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "INR";

    @Column(nullable = false, length = 20)
    private String provider; // SIMULATED, RAZORPAY, UPI_INTENT

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_level", nullable = false)
    private VerificationLevel verificationLevel = VerificationLevel.SIMULATED;

    @Column(name = "charged_amount", precision = 10, scale = 2)
    private BigDecimal chargedAmount;

    @Column(length = 12)
    private String utr;

    @Column(name = "method_hint", length = 20)
    private String methodHint;

    @Column(name = "provider_order_id", unique = true)
    private String providerOrderId;

    @Column(name = "provider_payment_id", unique = true)
    private String providerPaymentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.INITIATED;

    @Column(name = "failure_reason", length = 30)
    private String failureReason;

    @Column(name = "idempotency_key", unique = true)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Version
    private Integer version;

    // Convenience helpers for legacy code
    public Status getState() { return status; }
    public void setState(Status state) { this.status = state; }
}
