package com.trainconcierge.hotel.dto;

import java.math.BigDecimal;

public record ExtensionRequestResponse(
    Long id, String type, String requestedTime, String requestedDate,
    String status, BigDecimal feeEstimate, String responseNote, String createdAt
) {}
