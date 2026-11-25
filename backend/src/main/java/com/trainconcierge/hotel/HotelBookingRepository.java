package com.trainconcierge.hotel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface HotelBookingRepository extends JpaRepository<HotelBooking, Long> {
    List<HotelBooking> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<HotelBooking> findByJourneyId(Long journeyId);
    Optional<HotelBooking> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT hb FROM HotelBooking hb WHERE hb.journeyId = :journeyId AND hb.status <> com.trainconcierge.hotel.HotelBookingStatus.CANCELLED")
    Optional<HotelBooking> findActiveByJourneyId(Long journeyId);

    long countByStatus(HotelBookingStatus status);

    long countByUserId(Long userId);
}
