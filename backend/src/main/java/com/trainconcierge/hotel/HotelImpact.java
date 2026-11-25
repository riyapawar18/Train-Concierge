package com.trainconcierge.hotel;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hotel_impacts")
public class HotelImpact {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "impact_id", nullable = false) private Long impactId;
    @Column(name = "hotel_booking_id", nullable = false) private Long hotelBookingId;
    @Column(name = "new_arrival_at", nullable = false) private LocalDateTime newArrivalAt;
    @Column(name = "arrival_vs_checkin_minutes", nullable = false) private int arrivalVsCheckinMinutes;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private HotelImpactVerdict verdict;
    @Column(nullable = false, length = 500) private String summary;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public Long getImpactId() { return impactId; }
    public void setImpactId(Long i) { this.impactId = i; }
    public Long getHotelBookingId() { return hotelBookingId; }
    public void setHotelBookingId(Long b) { this.hotelBookingId = b; }
    public LocalDateTime getNewArrivalAt() { return newArrivalAt; }
    public void setNewArrivalAt(LocalDateTime t) { this.newArrivalAt = t; }
    public int getArrivalVsCheckinMinutes() { return arrivalVsCheckinMinutes; }
    public void setArrivalVsCheckinMinutes(int m) { this.arrivalVsCheckinMinutes = m; }
    public HotelImpactVerdict getVerdict() { return verdict; }
    public void setVerdict(HotelImpactVerdict v) { this.verdict = v; }
    public String getSummary() { return summary; }
    public void setSummary(String s) { this.summary = s; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime t) { this.createdAt = t; }
}
