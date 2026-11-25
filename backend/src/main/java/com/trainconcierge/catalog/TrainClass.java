package com.trainconcierge.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;

@Entity
@Table(name = "train_classes",
        uniqueConstraints = @UniqueConstraint(name = "uk_train_classes_class",
                columnNames = {"train_number", "class_code"}))
public class TrainClass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "train_number", nullable = false)
    private Train train;

    @Column(name = "class_code", nullable = false, length = 4)
    private String classCode;

    @Column(name = "base_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseFare;

    @Column(name = "total_seats", nullable = false)
    private int totalSeats;

    protected TrainClass() {
    }

    public Long getId() {
        return id;
    }

    public Train getTrain() {
        return train;
    }

    public String getClassCode() {
        return classCode;
    }

    public BigDecimal getBaseFare() {
        return baseFare;
    }

    public int getTotalSeats() {
        return totalSeats;
    }
}
