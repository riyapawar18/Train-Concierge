package com.trainconcierge.hotel.dto;

public record ManualHotelBookingRequest(
    Long hotelId, String checkInDate, String checkOutDate, String checkInTime,
    String checkOutTime, int guests, String lateArrivalCutoff, String notes, Long journeyId
) {}
