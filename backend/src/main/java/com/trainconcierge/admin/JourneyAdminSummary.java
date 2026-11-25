package com.trainconcierge.admin;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record JourneyAdminSummary(
        Long id, Long userId, String pnr, String trainName, String trainNumber,
        LocalDate travelDate, String fromName, String toName,
        String status, boolean flagged, LocalDateTime createdAt
) {}
