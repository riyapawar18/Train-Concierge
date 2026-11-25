package com.trainconcierge.payment.dto;

/**
 * Simple DTO returned by {@link com.trainconcierge.payment.gateway.PaymentGateway#createCheckout}
 * containing the data the front‑end needs to launch the payment UI.
 */
public class CheckoutResponse {
    private String provider; // SIMULATED, RAZORPAY, UPI_INTENT
    private String checkoutUrl; // for simulated or Razorpay checkout page
    private String orderId; // Razorpay order id (if applicable)
    private String upiLink; // UPI intent link (if applicable)

    public CheckoutResponse() {}

    public CheckoutResponse(String provider, String checkoutUrl, String orderId, String upiLink) {
        this.provider = provider;
        this.checkoutUrl = checkoutUrl;
        this.orderId = orderId;
        this.upiLink = upiLink;
    }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getCheckoutUrl() { return checkoutUrl; }
    public void setCheckoutUrl(String checkoutUrl) { this.checkoutUrl = checkoutUrl; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getUpiLink() { return upiLink; }
    public void setUpiLink(String upiLink) { this.upiLink = upiLink; }
}
