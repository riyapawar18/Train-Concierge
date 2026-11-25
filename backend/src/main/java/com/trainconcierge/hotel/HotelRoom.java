package com.trainconcierge.hotel;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "hotel_rooms",
       uniqueConstraints = @UniqueConstraint(name = "uk_hotel_rooms_room", columnNames = {"hotel_id", "room_no"}))
public class HotelRoom {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "hotel_id", nullable = false) private Long hotelId;
    @Column(nullable = false) private int floor;
    @Column(name = "room_no", nullable = false) private String roomNo;
    @Column(name = "room_type", nullable = false) private String roomType;
    @Column(nullable = false) private int capacity;
    @Column(name = "price_per_night", nullable = false, precision = 10, scale = 2) private BigDecimal pricePerNight;

    public Long getId() { return id; }
    public Long getHotelId() { return hotelId; }
    public int getFloor() { return floor; }
    public String getRoomNo() { return roomNo; }
    public String getRoomType() { return roomType; }
    public int getCapacity() { return capacity; }
    public BigDecimal getPricePerNight() { return pricePerNight; }
}
