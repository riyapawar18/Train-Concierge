package com.trainconcierge.payment;

/**
 * Legacy enum used by older services. It mirrors {@link Payment.Status}.
 */
public enum PaymentState {
    INITIATED,
    PENDING,
    SUCCESS,
    FAILED,
    EXPIRED
}
