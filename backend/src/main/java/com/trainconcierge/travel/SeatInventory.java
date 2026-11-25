package com.trainconcierge.travel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "seat_inventory",
        uniqueConstraints = @UniqueConstraint(name = "uk_seat_inventory_seat",
                columnNames = {"train_number", "travel_date", "coach_id", "seat_no"}))
public class SeatInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "train_number", nullable = false, length = 8)
    private String trainNumber;

    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "coach_id", nullable = false)
    private Coach coach;

    @Column(name = "seat_no", nullable = false)
    private int seatNo;

    @Column(name = "berth_type", length = 4)
    private String berthType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private SeatStatus status;

    @Column(name = "held_until")
    private LocalDateTime heldUntil;

    @Column(name = "held_by")
    private Long heldBy;

    @Version
    @Column(nullable = false)
    private long version;

    protected SeatInventory() {
    }

    public Long getId() {
        return id;
    }

    public String getTrainNumber() {
        return trainNumber;
    }

    public LocalDate getTravelDate() {
        return travelDate;
    }

    public Coach getCoach() {
        return coach;
    }

    public int getSeatNo() {
        return seatNo;
    }

    public String getBerthType() {
        return berthType;
    }

    public SeatStatus getStatus() {
        return status;
    }

    public LocalDateTime getHeldUntil() {
        return heldUntil;
    }

    public Long getHeldBy() {
        return heldBy;
    }

    public long getVersion() {
        return version;
    }

    public void hold(Long userId, LocalDateTime until) {
        this.status = SeatStatus.HELD;
        this.heldBy = userId;
        this.heldUntil = until;
    }

    public void release() {
        this.status = SeatStatus.AVAILABLE;
        this.heldBy = null;
        this.heldUntil = null;
    }

    public void confirm() {
        this.status = SeatStatus.OCCUPIED;
        this.heldBy = null;
        this.heldUntil = null;
    }
}
