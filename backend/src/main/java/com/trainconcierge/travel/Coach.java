package com.trainconcierge.travel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "coaches",
        uniqueConstraints = @UniqueConstraint(name = "uk_coaches_number",
                columnNames = {"train_number", "coach_no"}))
public class Coach {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "train_number", nullable = false, length = 8)
    private String trainNumber;

    @Column(name = "class_code", nullable = false, length = 4)
    private String classCode;

    @Column(name = "coach_no", nullable = false, length = 8)
    private String coachNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CoachLayout layout;

    @Column(name = "seat_count", nullable = false)
    private int seatCount;

    protected Coach() {
    }

    public Long getId() {
        return id;
    }

    public String getTrainNumber() {
        return trainNumber;
    }

    public String getClassCode() {
        return classCode;
    }

    public String getCoachNo() {
        return coachNo;
    }

    public CoachLayout getLayout() {
        return layout;
    }

    public int getSeatCount() {
        return seatCount;
    }
}
