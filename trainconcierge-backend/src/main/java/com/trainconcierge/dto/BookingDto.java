package com.trainconcierge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingDto {
    private Long id;
    private Long userId;
    private String username;
    private Long trainId;
    private String trainNumber;
    private String trainName;
    private String fromStation;
    private String toStation;
    private String travelDate;
    private String departureTime;
    private String arrivalTime;
    private int numberOfSeats;
    private double totalAmount;
    private String status;
    private LocalDateTime bookedAt;
    private LocalDateTime cancelledAt;
    private String cancellationReason;
    private Long originalBookingId;
    private String trainStatus;
    private int trainDelayMinutes;
}
