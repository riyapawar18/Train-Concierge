package com.trainconcierge.hotel.dto;

import java.util.List;

public record HotelImpactSummary(
    String verdict, String summary, String newArrivalAt, int arrivalVsCheckinMinutes,
    List<String> actions
) {}
