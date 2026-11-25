package com.trainconcierge.admin;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ExtensionRequestAdminEntry(
        Long id, Long hotelBookingId, String type, String status,
        BigDecimal feeEstimate, String responseNote,
        LocalDateTime createdAt, LocalDateTime resolvedAt
) {}
