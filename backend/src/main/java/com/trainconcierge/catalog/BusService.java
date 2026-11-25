package com.trainconcierge.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.LocalTime;

@Entity
@Table(name = "bus_services", uniqueConstraints = @UniqueConstraint(
        name = "uk_bus_services_service",
        columnNames = {"operator", "from_city", "to_city", "departure_time"}))
public class BusService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String operator;

    @Column(name = "bus_type", nullable = false, length = 20)
    private String busType;

    @Column(name = "from_city", nullable = false, length = 80)
    private String fromCity;

    @Column(name = "to_city", nullable = false, length = 80)
    private String toCity;

    @Column(name = "from_station_code", length = 8)
    private String fromStationCode;

    @Column(name = "departure_time", nullable = false)
    private LocalTime departureTime;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "base_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseFare;

    @Column(name = "total_seats", nullable = false)
    private int totalSeats;

    protected BusService() {
    }

    public Long getId() {
        return id;
    }

    public String getOperator() {
        return operator;
    }

    public String getBusType() {
        return busType;
    }

    public String getFromCity() {
        return fromCity;
    }

    public String getToCity() {
        return toCity;
    }

    public String getFromStationCode() {
        return fromStationCode;
    }

    public LocalTime getDepartureTime() {
        return departureTime;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public BigDecimal getBaseFare() {
        return baseFare;
    }

    public int getTotalSeats() {
        return totalSeats;
    }
}
