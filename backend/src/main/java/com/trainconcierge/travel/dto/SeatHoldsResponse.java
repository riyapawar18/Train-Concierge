package com.trainconcierge.travel.dto;

import java.time.Instant;
import java.util.List;

public record SeatHoldsResponse(List<SeatHoldResponse> holds, Instant serverTime) {
}
