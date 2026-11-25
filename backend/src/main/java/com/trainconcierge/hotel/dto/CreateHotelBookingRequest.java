package com.trainconcierge.hotel.dto;

import java.math.BigDecimal;

public record CreateHotelBookingRequest(
    Long hotelId, Long roomId, String checkInDate, String checkOutDate, int guests,
    BigDecimal totalPrice, Long journeyId, Long holdId
) {}
