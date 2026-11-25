package com.trainconcierge.hotel;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "hotel_extension_requests")
public class HotelExtensionRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "hotel_booking_id", nullable = false) private Long hotelBookingId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private HotelExtensionType type;
    @Column(name = "requested_time") private LocalTime requestedTime;
    @Column(name = "requested_date") private LocalDate requestedDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private HotelExtensionStatus status;
    @Column(name = "fee_estimate", precision = 10, scale = 2) private BigDecimal feeEstimate;
    @Column(name = "response_note", length = 500) private String responseNote;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "resolved_at") private LocalDateTime resolvedAt;

    public Long getId() { return id; }
    public Long getHotelBookingId() { return hotelBookingId; }
    public void setHotelBookingId(Long id) { this.hotelBookingId = id; }
    public HotelExtensionType getType() { return type; }
    public void setType(HotelExtensionType type) { this.type = type; }
    public LocalTime getRequestedTime() { return requestedTime; }
    public void setRequestedTime(LocalTime t) { this.requestedTime = t; }
    public LocalDate getRequestedDate() { return requestedDate; }
    public void setRequestedDate(LocalDate d) { this.requestedDate = d; }
    public HotelExtensionStatus getStatus() { return status; }
    public void setStatus(HotelExtensionStatus s) { this.status = s; }
    public BigDecimal getFeeEstimate() { return feeEstimate; }
    public void setFeeEstimate(BigDecimal f) { this.feeEstimate = f; }
    public String getResponseNote() { return responseNote; }
    public void setResponseNote(String n) { this.responseNote = n; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime t) { this.resolvedAt = t; }
}
