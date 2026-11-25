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

import java.time.LocalDate;

@Entity
@Table(name = "bus_trips", uniqueConstraints = @UniqueConstraint(
        name = "uk_bus_trips_trip",
        columnNames = {"bus_service_id", "travel_date"}))
public class BusTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bus_service_id", nullable = false)
    private BusService service;

    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;

    @Column(name = "seats_left", nullable = false)
    private int seatsLeft;

    protected BusTrip() {
    }

    public Long getId() {
        return id;
    }

    public BusService getService() {
        return service;
    }

    public LocalDate getTravelDate() {
        return travelDate;
    }

    public int getSeatsLeft() {
        return seatsLeft;
    }
}
