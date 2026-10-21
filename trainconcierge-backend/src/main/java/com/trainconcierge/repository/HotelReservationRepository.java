package com.trainconcierge.repository;

import com.trainconcierge.entity.HotelReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HotelReservationRepository extends JpaRepository<HotelReservation, Long> {
    List<HotelReservation> findByBookingId(Long bookingId);
    List<HotelReservation> findByBookingUserId(Long userId);
}
