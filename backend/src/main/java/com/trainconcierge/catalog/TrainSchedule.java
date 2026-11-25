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

import java.time.LocalTime;

@Entity
@Table(name = "train_schedule",
        uniqueConstraints = @UniqueConstraint(name = "uk_train_schedule_stop",
                columnNames = {"train_number", "stop_order"}))
public class TrainSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "train_number", nullable = false)
    private Train train;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "station_code", nullable = false)
    private Station station;

    @Column(name = "stop_order", nullable = false)
    private int stopOrder;

    @Column(name = "arrival_time")
    private LocalTime arrivalTime;

    @Column(name = "departure_time")
    private LocalTime departureTime;

    @Column(name = "day_offset", nullable = false)
    private int dayOffset;

    @Column(name = "distance_km", nullable = false)
    private int distanceKm;

    protected TrainSchedule() {
    }

    public Long getId() {
        return id;
    }

    public Train getTrain() {
        return train;
    }

    public Station getStation() {
        return station;
    }

    public int getStopOrder() {
        return stopOrder;
    }

    public LocalTime getArrivalTime() {
        return arrivalTime;
    }

    public LocalTime getDepartureTime() {
        return departureTime;
    }

    public int getDayOffset() {
        return dayOffset;
    }

    public int getDistanceKm() {
        return distanceKm;
    }
}
