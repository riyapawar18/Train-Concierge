package com.trainconcierge.booking.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record JourneyListItemResponse(
        Long id,
        String pnr,
        String title,
        String trainNumber,
        String trainName,
        LocalDate travelDate,
        LocalDateTime boardingTime,
        LocalDateTime arrivalTime,
        String classCode,
        String className,
        String quota,
        StationRefResponse from,
        StationRefResponse to,
        int passengerCount,
        List<String> seatLabels,
        String status,
        String bookingStatus,
        BigDecimal totalFare,
        BigDecimal refundAmount,
        Integer refundPercent,
        LocalDateTime createdAt
) {
}
