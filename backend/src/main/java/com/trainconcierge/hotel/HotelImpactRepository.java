package com.trainconcierge.hotel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface HotelImpactRepository extends JpaRepository<HotelImpact, Long> {
    Optional<HotelImpact> findByImpactIdAndHotelBookingId(Long impactId, Long hotelBookingId);
    List<HotelImpact> findByHotelBookingId(Long hotelBookingId);
    List<HotelImpact> findByImpactId(Long impactId);
}
