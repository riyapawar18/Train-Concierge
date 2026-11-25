package com.trainconcierge.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "seat_alert_log",
        uniqueConstraints = @UniqueConstraint(name = "uk_seat_alert_log_user_train_date",
                columnNames = {"user_id", "train_number", "travel_date"}))
public class SeatAlertLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "train_number", nullable = false, length = 8)
    private String trainNumber;

    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;

    @Column(name = "class_code", nullable = false, length = 4)
    private String classCode;

    @Column(name = "seats_left", nullable = false)
    private int seatsLeft;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected SeatAlertLog() {
    }

    public static SeatAlertLog create(Long userId, String trainNumber, LocalDate travelDate,
                                      String classCode, int seatsLeft, LocalDateTime createdAt) {
        SeatAlertLog log = new SeatAlertLog();
        log.userId = userId;
        log.trainNumber = trainNumber;
        log.travelDate = travelDate;
        log.classCode = classCode;
        log.seatsLeft = seatsLeft;
        log.createdAt = createdAt;
        return log;
    }

    public void refresh(String classCode, int seatsLeft, LocalDateTime createdAt) {
        this.classCode = classCode;
        this.seatsLeft = seatsLeft;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getTrainNumber() {
        return trainNumber;
    }

    public LocalDate getTravelDate() {
        return travelDate;
    }

    public String getClassCode() {
        return classCode;
    }

    public int getSeatsLeft() {
        return seatsLeft;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
