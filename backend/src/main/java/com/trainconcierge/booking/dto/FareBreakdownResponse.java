package com.trainconcierge.booking.dto;

import java.math.BigDecimal;

public record FareBreakdownResponse(
        BigDecimal baseFare,
        BigDecimal reservationCharge,
        BigDecimal gst,
        BigDecimal totalFare,
        BigDecimal perPassenger
) {
}
