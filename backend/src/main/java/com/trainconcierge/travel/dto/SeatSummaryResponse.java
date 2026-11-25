package com.trainconcierge.travel.dto;

public record SeatSummaryResponse(int total, int available, int occupied, int held) {
}
