package com.trainconcierge.payment.dto;

import com.trainconcierge.payment.PaymentPurpose;
import lombok.Data;
import java.math.BigDecimal;

/**
 * DTO used by the client to request a new payment initiation.
 */
@Data
public class InitiatePaymentRequest {
    private PaymentPurpose purpose;
    private String referenceType;
    private Long referenceId;
    private BigDecimal amount;
    private String currency = "INR"; // default
    private String idempotencyKey; // optional, for idempotent calls
}
