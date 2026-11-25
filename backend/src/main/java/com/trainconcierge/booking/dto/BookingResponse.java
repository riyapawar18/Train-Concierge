package com.trainconcierge.booking.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record BookingResponse(
        Long id,
        String pnr,
        Long journeyId,
        String status,
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
        List<BookingPassengerResponse> passengers,
        FareBreakdownResponse fare,
        String contactEmail,
        String contactMobile,
        LocalDateTime createdAt,
        LocalDateTime cancelledAt,
        RefundResponse refund
) {
}
