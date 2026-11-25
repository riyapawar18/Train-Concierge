package com.trainconcierge.booking;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @EntityGraph(attributePaths = {"train", "fromStation", "toStation", "passengers"})
    Optional<Booking> findByIdAndUserId(Long id, Long userId);

    @EntityGraph(attributePaths = {"train", "fromStation", "toStation", "passengers"})
    Optional<Booking> findByPnrAndUserId(String pnr, Long userId);

    boolean existsByPnr(String pnr);

    long countByUserId(Long userId);

    @Query("""
            select distinct b from Booking b
            join fetch b.train
            join fetch b.fromStation
            join fetch b.toStation
            left join fetch b.passengers
            where b.train.number = :trainNumber
              and b.travelDate = :travelDate
              and b.status = :status
            order by b.id
            """)
    List<Booking> findForTrainAndDate(@Param("trainNumber") String trainNumber,
                                      @Param("travelDate") LocalDate travelDate,
                                      @Param("status") BookingStatus status);

    @Query("""
            select b from Booking b
            where b.userId = :userId and b.id <> :bookingId and b.status = :status
              and b.boardingTime >= :from and b.boardingTime < :to
            order by b.boardingTime
            """)
    List<Booking> findConnectingBookings(@Param("userId") Long userId,
                                         @Param("bookingId") Long bookingId,
                                         @Param("status") BookingStatus status,
                                         @Param("from") java.time.LocalDateTime from,
                                         @Param("to") java.time.LocalDateTime to);
}
