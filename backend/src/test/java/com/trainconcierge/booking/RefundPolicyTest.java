package com.trainconcierge.booking;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class RefundPolicyTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 28, 12, 0);
    private static final BigDecimal FARE = new BigDecimal("1000.00");

    @Test
    void refundTiersFollowTheHoursLeftBeforeDeparture() {
        assertEstimate(NOW.plusHours(49), 75, "750.00");
        assertEstimate(NOW.plusHours(48), 50, "500.00");
        assertEstimate(NOW.plusHours(13), 50, "500.00");
        assertEstimate(NOW.plusHours(12), 25, "250.00");
        assertEstimate(NOW.plusHours(5), 25, "250.00");
        assertEstimate(NOW.plusHours(4), 0, "0.00");
        assertEstimate(NOW.minusHours(1), 0, "0.00");
    }

    private static void assertEstimate(LocalDateTime boardingTime, int percent, String amount) {
        RefundPolicy.Refund refund = RefundPolicy.estimate(FARE, boardingTime, NOW);
        assertThat(refund.percent()).isEqualTo(percent);
        assertThat(refund.amount()).isEqualByComparingTo(new BigDecimal(amount));
    }
}
