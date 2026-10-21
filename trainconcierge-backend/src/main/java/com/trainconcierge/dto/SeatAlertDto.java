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
public class SeatAlertDto {
    private Long id;
    private Long userId;
    private String fromStation;
    private String toStation;
    private LocalDate travelDate;
    private int seatsRequired;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime triggeredAt;
}
