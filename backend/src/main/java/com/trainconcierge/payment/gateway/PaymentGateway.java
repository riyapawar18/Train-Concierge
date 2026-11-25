package com.trainconcierge.payment.gateway;

import com.trainconcierge.payment.Payment;
import com.trainconcierge.payment.dto.CheckoutResponse;
import com.trainconcierge.payment.dto.VerificationResult;
import com.trainconcierge.payment.dto.WebhookResult;

/**
 * Abstraction for a payment provider. Implementations know how to create a checkout session,
 * verify a payment proof (or simulated verify), and process inbound webhooks.
 */
public interface PaymentGateway {

    /**
     * Creates a checkout session for the given payment. The implementation returns a DTO that
     * contains whatever data the front‑end needs to launch the provider UI (e.g., orderId,
     * checkoutUrl, or UPI link).
     */
    CheckoutResponse createCheckout(Payment payment);

    /**
     * Verifies the payment using data supplied by the client (or by the provider).
     * Returns the verification outcome and any additional data to store on the payment.
     */
    VerificationResult verify(Payment payment, Object proof);

    /**
     * Handles a raw webhook payload from the provider. The method receives the body bytes and the
     * signature header (if any) and should return a {@link WebhookResult} indicating whether the
     * webhook was applied, ignored, duplicate, or rejected.
     */
    WebhookResult handleWebhook(byte[] rawBody, String signatureHeader);
}
