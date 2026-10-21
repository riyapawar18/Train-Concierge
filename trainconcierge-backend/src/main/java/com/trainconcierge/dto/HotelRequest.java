package com.trainconcierge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class HotelRequest {
    @NotNull
    private Long bookingId;
    @NotBlank
    private String hotelName;
    @NotBlank
    private String city;
    @NotNull
    private LocalDate checkIn;
    @NotNull
    private LocalDate checkOut;
    private int rooms = 1;
    private double pricePerNight;
}
