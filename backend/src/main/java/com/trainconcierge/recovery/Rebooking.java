package com.trainconcierge.recovery;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rebookings")
public class Rebooking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_booking_id", nullable = false)
    private Long sourceBookingId;

    @Column(name = "new_booking_id")
    private Long newBookingId;

    @Column(name = "payment_id", nullable = false, unique = true)
    private Long paymentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RebookingStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    // getters & setters
    public Long getId() { return id; }
    public Long getSourceBookingId() { return sourceBookingId; }
    public void setSourceBookingId(Long sourceBookingId) { this.sourceBookingId = sourceBookingId; }
    public Long getNewBookingId() { return newBookingId; }
    public void setNewBookingId(Long newBookingId) { this.newBookingId = newBookingId; }
    public Long getPaymentId() { return paymentId; }
    public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }
    public RebookingStatus getStatus() { return status; }
    public void setStatus(RebookingStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
