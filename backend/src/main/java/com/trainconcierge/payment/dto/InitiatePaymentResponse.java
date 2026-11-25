package com.trainconcierge.payment.dto;

import lombok.Data;

/**
 * DTO returned after a payment is created. It contains the information the front‑end needs
 * to launch the checkout UI (URL, order id, etc.).
 */
@Data
public class InitiatePaymentResponse {
    private Long paymentId;
    private String provider; // SIMULATED, RAZORPAY, UPI_INTENT
    private String checkoutUrl; // for simulated or Razorpay checkout page
    private String orderId; // Razorpay order id (if applicable)
    private String upiLink; // UPI intent link (if applicable)
}
