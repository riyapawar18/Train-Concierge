package com.trainconcierge.booking.dto;

import java.time.LocalDateTime;

public record JourneyCancelResponse(
        Long journeyId,
        String pnr,
        String status,
        RefundResponse refund,
        LocalDateTime cancelledAt
) {
}
