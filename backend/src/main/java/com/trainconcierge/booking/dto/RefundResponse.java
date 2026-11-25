package com.trainconcierge.booking.dto;

import com.trainconcierge.booking.RefundPolicy;

import java.math.BigDecimal;

public record RefundResponse(BigDecimal amount, int percent, String label, boolean simulated) {

    public static RefundResponse of(BigDecimal amount, Integer percent) {
        if (amount == null) {
            return null;
        }
        return new RefundResponse(amount, percent == null ? 0 : percent, RefundPolicy.LABEL, true);
    }
}
