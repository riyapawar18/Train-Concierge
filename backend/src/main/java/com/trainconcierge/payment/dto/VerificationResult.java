package com.trainconcierge.payment.dto;

/**
 * Result of a verification attempt. Indicates whether the payment is considered SUCCESS,
 * FAILED, or still PENDING, and may contain provider‑specific identifiers.
 */
public class VerificationResult {
    public enum Status {
        SUCCESS,
        FAILED,
        PENDING
    }

    private Status status;
    private String providerPaymentId; // Razorpay payment id, etc.
    private String failureReason;

    public VerificationResult() {}

    public VerificationResult(Status status, String providerPaymentId, String failureReason) {
        this.status = status;
        this.providerPaymentId = providerPaymentId;
        this.failureReason = failureReason;
    }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public String getProviderPaymentId() { return providerPaymentId; }
    public void setProviderPaymentId(String providerPaymentId) { this.providerPaymentId = providerPaymentId; }
    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
}
