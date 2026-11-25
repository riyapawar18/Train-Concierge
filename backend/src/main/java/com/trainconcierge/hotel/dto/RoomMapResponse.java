package com.trainconcierge.hotel.dto;

import java.math.BigDecimal;
import java.util.List;

public record RoomMapResponse(
    List<FloorData> floors,
    List<NightAvailability> dateStrip,
    int totalRooms,
    int availableTonight
) {
    public record FloorData(int floor, List<RoomData> rooms) {}
    public record RoomData(Long id, String roomNo, String roomType, int capacity,
        BigDecimal pricePerNight, String status) {}
    public record NightAvailability(String date, int available, int total) {}
}
