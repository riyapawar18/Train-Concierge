package com.trainconcierge.hotel.dto;

import java.math.BigDecimal;

public record HotelResponse(
    Long id, String name, String stationCode, String address,
    BigDecimal distanceKm, BigDecimal priceMin, BigDecimal priceMax,
    BigDecimal rating, String phone, String email, String mapUrl,
    int availableRoomsTonight
) {}
