package com.trainconcierge.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.trainconcierge.payment.PaymentMode;

/**
 * Validates payment mode configuration at startup.
 *
 * <p>If {@code mode} is {@code RAZORPAY_TEST} it ensures that the Razorpay test key and secret are provided
 * and that the key does not start with {@code rzp_live_} (which would indicate a live key, which is forbidden).
 *
 * <p>If {@code mode} is {@code UPI_INTENT_DEMO} it ensures that a VPA is supplied.
 */
@Component
public class PaymentModeValidator {

    @Autowired
    private com.trainconcierge.config.PaymentProperties props;

    @PostConstruct
    public void validate() {
        PaymentMode mode = props.getMode();
        if (mode == null) {
            throw new IllegalStateException("Payment mode must be set");
        }
        switch (mode) {
            case RAZORPAY_TEST -> {
                if (props.getRazorpayKeyId() == null || props.getRazorpayKeySecret() == null) {
                    throw new IllegalStateException("Razorpay test mode requires key id and secret");
                }
                if (props.getRazorpayKeyId().startsWith("rzp_live_")) {
                    throw new IllegalStateException("Live Razorpay keys are not allowed – use test keys only");
                }
            }
            case UPI_INTENT_DEMO -> {
                if (props.getDemoUpiVpa() == null || props.getDemoUpiVpa().isBlank()) {
                    throw new IllegalStateException("UPI demo mode requires a valid VPA (demoUpiVpa)");
                }
            }
            default -> { /* SIMULATED needs nothing extra */ }
        }
    }
}
