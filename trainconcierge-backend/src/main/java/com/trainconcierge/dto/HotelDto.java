package com.trainconcierge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelDto {
    private Long id;
    private Long bookingId;
    private String hotelName;
    private String city;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private int rooms;
    private double pricePerNight;
    private double totalAmount;
    private String status;
    private LocalDateTime createdAt;
}
