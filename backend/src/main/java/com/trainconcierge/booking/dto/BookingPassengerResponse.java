package com.trainconcierge.booking.dto;

public record BookingPassengerResponse(
        Long id,
        String name,
        int age,
        String gender,
        String berthPreference,
        Integer seatNo,
        String berthType,
        String seatLabel,
        String coachNo
) {
}
