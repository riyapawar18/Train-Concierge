package com.trainconcierge.hotel;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "hotels",
       uniqueConstraints = @UniqueConstraint(name = "uk_hotels_name", columnNames = {"name", "station_code"}))
public class Hotel {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private String name;
    @Column(name = "station_code", nullable = false) private String stationCode;
    @Column(nullable = false) private String address;
    @Column(name = "distance_km", nullable = false, precision = 4, scale = 1) private BigDecimal distanceKm;
    @Column(name = "price_min", nullable = false, precision = 10, scale = 2) private BigDecimal priceMin;
    @Column(name = "price_max", nullable = false, precision = 10, scale = 2) private BigDecimal priceMax;
    @Column(nullable = false, precision = 2, scale = 1) private BigDecimal rating;
    @Column(nullable = false) private String phone;
    @Column(nullable = false) private String email;
    @Column(name = "map_url", nullable = false) private String mapUrl;

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getStationCode() { return stationCode; }
    public String getAddress() { return address; }
    public BigDecimal getDistanceKm() { return distanceKm; }
    public BigDecimal getPriceMin() { return priceMin; }
    public BigDecimal getPriceMax() { return priceMax; }
    public BigDecimal getRating() { return rating; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getMapUrl() { return mapUrl; }
}
