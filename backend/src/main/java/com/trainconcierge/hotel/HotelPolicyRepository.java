package com.trainconcierge.hotel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface HotelPolicyRepository extends JpaRepository<HotelPolicy, Long> {
    Optional<HotelPolicy> findByHotelId(Long hotelId);
}
