package com.trainconcierge.hotel;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "room_availability",
       uniqueConstraints = @UniqueConstraint(name = "uk_room_availability_night", columnNames = {"room_id", "stay_date"}))
public class RoomAvailability {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "room_id", nullable = false) private Long roomId;
    @Column(name = "stay_date", nullable = false) private LocalDate stayDate;
    @Column(nullable = false) private String status; // AVAILABLE, BOOKED, HELD
    @Column(name = "held_until") private LocalDateTime heldUntil;
    @Version private Long version;

    public Long getId() { return id; }
    public Long getRoomId() { return roomId; }
    public void setRoomId(Long r) { this.roomId = r; }
    public LocalDate getStayDate() { return stayDate; }
    public void setStayDate(LocalDate d) { this.stayDate = d; }
    public String getStatus() { return status; }
    public void setStatus(String s) { this.status = s; }
    public LocalDateTime getHeldUntil() { return heldUntil; }
    public void setHeldUntil(LocalDateTime t) { this.heldUntil = t; }
    public Long getVersion() { return version; }
}
