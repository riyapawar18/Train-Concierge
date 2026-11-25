package com.trainconcierge.hotel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HotelRepository extends JpaRepository<Hotel, Long> {
    List<Hotel> findByStationCodeOrderByDistanceKmAsc(String stationCode);
    List<Hotel> findByStationCodeOrderByRatingDesc(String stationCode);
    List<Hotel> findByStationCodeOrderByPriceMinAsc(String stationCode);
}
