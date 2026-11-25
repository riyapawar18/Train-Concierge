package com.trainconcierge.hotel.dto;

import java.math.BigDecimal;
import java.util.List;

public record HotelBookingResponse(
    Long id, Long hotelId, String hotelName, String hotelPhone,
    Long roomId, String roomNo, String roomType,
    String checkInDate, String checkInTime, String checkOutDate, String checkOutTime,
    int guests, BigDecimal totalPrice, String status,
    String lateArrivalCutoff, String notes, boolean manualEntry,
    Long journeyId, String createdAt,
    HotelImpactSummary impact,
    List<ExtensionRequestResponse> extensionRequests
) {}
