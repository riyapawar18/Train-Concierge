package com.trainconcierge.hotel;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "hotel_bookings")
public class HotelBooking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "journey_id") private Long journeyId;
    @Column(name = "hotel_id", nullable = false) private Long hotelId;
    @Column(name = "room_id", nullable = false) private Long roomId;
    @Column(name = "check_in_date", nullable = false) private LocalDate checkInDate;
    @Column(name = "check_in_time", nullable = false) private LocalTime checkInTime;
    @Column(name = "check_out_date", nullable = false) private LocalDate checkOutDate;
    @Column(name = "check_out_time", nullable = false) private LocalTime checkOutTime;
    @Column(nullable = false) private int guests = 1;
    @Column(name = "total_price", nullable = false, precision = 10, scale = 2) private BigDecimal totalPrice;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private HotelBookingStatus status;
    @Column(name = "late_arrival_cutoff") private LocalTime lateArrivalCutoff;
    @Column(length = 500) private String notes;
    @Column(name = "manual_entry", nullable = false) private boolean manualEntry = false;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Version private Long version;

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getJourneyId() { return journeyId; }
    public void setJourneyId(Long journeyId) { this.journeyId = journeyId; }
    public Long getHotelId() { return hotelId; }
    public void setHotelId(Long hotelId) { this.hotelId = hotelId; }
    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }
    public LocalDate getCheckInDate() { return checkInDate; }
    public void setCheckInDate(LocalDate checkInDate) { this.checkInDate = checkInDate; }
    public LocalTime getCheckInTime() { return checkInTime; }
    public void setCheckInTime(LocalTime checkInTime) { this.checkInTime = checkInTime; }
    public LocalDate getCheckOutDate() { return checkOutDate; }
    public void setCheckOutDate(LocalDate checkOutDate) { this.checkOutDate = checkOutDate; }
    public LocalTime getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(LocalTime checkOutTime) { this.checkOutTime = checkOutTime; }
    public int getGuests() { return guests; }
    public void setGuests(int guests) { this.guests = guests; }
    public BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }
    public HotelBookingStatus getStatus() { return status; }
    public void setStatus(HotelBookingStatus status) { this.status = status; }
    public LocalTime getLateArrivalCutoff() { return lateArrivalCutoff; }
    public void setLateArrivalCutoff(LocalTime lateArrivalCutoff) { this.lateArrivalCutoff = lateArrivalCutoff; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public boolean isManualEntry() { return manualEntry; }
    public void setManualEntry(boolean manualEntry) { this.manualEntry = manualEntry; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public Long getVersion() { return version; }
}
