package com.trainconcierge.booking;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;

public final class RefundPolicy {

    public static final String LABEL = "Estimated refund";

    private RefundPolicy() {
    }

    public static Refund estimate(BigDecimal totalFare, LocalDateTime boardingTime,
                                  LocalDateTime now) {
        long hours = Duration.between(now, boardingTime).toHours();
        int percent;
        if (hours > 48) {
            percent = 75;
        } else if (hours > 12) {
            percent = 50;
        } else if (hours > 4) {
            percent = 25;
        } else {
            percent = 0;
        }
        BigDecimal amount = totalFare.multiply(BigDecimal.valueOf(percent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return new Refund(amount, percent);
    }

    public record Refund(BigDecimal amount, int percent) {
    }
}
