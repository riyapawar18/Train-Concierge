package com.trainconcierge.recovery.bus;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bus_seats", uniqueConstraints = {@UniqueConstraint(columnNames = {"bus_trip_id", "seat_code"})})
public class BusSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bus_trip_id", nullable = false)
    private Long busTripId;

    @Column(name = "seat_code", nullable = false, length = 5)
    private String seatCode; // e.g. "1A", "2C"

    @Column(name = "seat_type", nullable = false, length = 10)
    private String seatType; // "SLEEPER" or "SEATER"

    @Column(name = "status", nullable = false, length = 10)
    private String status; // FREE, HELD, BOOKED

    @Column(name = "held_by")
    private Long heldBy; // user_id who holds the seat

    @Column(name = "held_until")
    private LocalDateTime heldUntil;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getBusTripId() { return busTripId; }
    public void setBusTripId(Long busTripId) { this.busTripId = busTripId; }
    public String getSeatCode() { return seatCode; }
    public void setSeatCode(String seatCode) { this.seatCode = seatCode; }
    public String getSeatType() { return seatType; }
    public void setSeatType(String seatType) { this.seatType = seatType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getHeldBy() { return heldBy; }
    public void setHeldBy(Long heldBy) { this.heldBy = heldBy; }
    public LocalDateTime getHeldUntil() { return heldUntil; }
    public void setHeldUntil(LocalDateTime heldUntil) { this.heldUntil = heldUntil; }
}
