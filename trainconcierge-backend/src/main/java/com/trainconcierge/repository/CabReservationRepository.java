package com.trainconcierge.repository;

import com.trainconcierge.entity.CabReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CabReservationRepository extends JpaRepository<CabReservation, Long> {
    List<CabReservation> findByBookingId(Long bookingId);
    List<CabReservation> findByBookingUserId(Long userId);
}
