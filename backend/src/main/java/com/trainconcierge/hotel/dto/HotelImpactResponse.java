package com.trainconcierge.hotel.dto;

import java.util.List;

public record HotelImpactResponse(
    Long hotelBookingId, String hotelName, String verdict, String summary,
    String newArrivalAt, int arrivalVsCheckinMinutes, List<String> actions
) {}
