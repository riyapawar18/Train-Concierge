package com.trainconcierge.hotel.dto;

import java.util.List;

public record RoomHoldResponse(Long holdId, String expiresAt, List<Long> roomAvailabilityIds) {}
