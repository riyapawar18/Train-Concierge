package com.trainconcierge.booking.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record JourneyDetailResponse(
        Long id,
        String pnr,
        String title,
        String notes,
        String status,
        String bookingStatus,
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
        List<JourneyPassengerResponse> passengers,
        FareBreakdownResponse fare,
        List<JourneyRouteStopResponse> route,
        String contactEmail,
        String contactMobile,
        LocalDateTime createdAt,
        LocalDateTime cancelledAt,
        RefundResponse refund,
        JourneyDisruptionResponse disruption,
        JourneyHotelResponse hotel
) {
}
