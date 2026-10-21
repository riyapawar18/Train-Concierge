package com.trainconcierge.repository;

import com.trainconcierge.entity.Booking;
import com.trainconcierge.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUserOrderByBookedAtDesc(User user);

    List<Booking> findByUserIdOrderByBookedAtDesc(Long userId);

    @Query("SELECT b FROM Booking b WHERE b.user.id = :userId AND b.status = :status ORDER BY b.bookedAt DESC")
    List<Booking> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") Booking.BookingStatus status);

    @Query("SELECT b FROM Booking b WHERE b.train.id = :trainId AND b.status = 'CONFIRMED'")
    List<Booking> findConfirmedByTrainId(@Param("trainId") Long trainId);

    List<Booking> findByOriginalBookingId(Long originalBookingId);
}
