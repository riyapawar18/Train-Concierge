package com.trainconcierge.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Configuration properties for the payment subsystem.
 *
 * <p>The values are loaded from {@code application.yml} (or {@code .properties}) under the
 * {@code payment} prefix. All fields are validated at startup; the {@link PaymentModeValidator}
 * performs additional cross‑field checks (e.g., refusing live Razorpay keys).</p>
 */
@Data
@Validated
@ConfigurationProperties(prefix = "payment")
public class PaymentProperties {

    /**
     * Operational mode of the payment system. Defaults to {@code SIMULATED}.
     */
    @NotNull
    private com.trainconcierge.payment.PaymentMode mode = com.trainconcierge.payment.PaymentMode.SIMULATED;

    /**
     * Expiry time in minutes for a payment after it is initiated.
     */
    @NotNull
    private Integer expiryMinutes = 15;

    // --- Razorpay test‑mode settings (optional) ---------------------------------
    /** Razorpay test key id (e.g., {@code rzp_test_...}). */
    private String razorpayKeyId;

    /** Razorpay test secret (e.g., {@code 1234567890abcdef}). */
    private String razorpayKeySecret;

    /** Razorpay webhook secret for signature verification. */
    private String razorpayWebhookSecret;

    // --- UPI intent demo settings --------------------------------------------
    /** The VPA (e.g., {@code example@upi}) that receives the demo payment. */
    @Pattern(regexp = "^[^@]+@[^@]+$")
    private String demoUpiVpa;

    /** Display name of the payee for the UPI demo. */
    private String demoUpiPayeeName;

    /** Optional amount (in INR) to be shown on the UPI intent screen. */
    private String demoUpiAmount = "1.00"; // tiny amount for demo purposes
}
