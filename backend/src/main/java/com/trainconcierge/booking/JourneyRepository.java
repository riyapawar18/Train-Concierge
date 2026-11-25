package com.trainconcierge.booking;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface JourneyRepository extends JpaRepository<Journey, Long> {

    @EntityGraph(attributePaths = {"booking", "booking.train", "booking.fromStation",
            "booking.toStation", "booking.passengers"})
    List<Journey> findByUserId(Long userId);

    List<Journey> findByUserIdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"booking", "booking.train", "booking.fromStation",
            "booking.toStation", "booking.passengers"})
    Optional<Journey> findByIdAndUserId(Long id, Long userId);

    Optional<Journey> findByBookingId(Long bookingId);

    boolean existsByUserIdAndTitle(Long userId, String title);

    long countByUserId(Long userId);

    long countByStoredStatus(JourneyStatus status);

    long countByStoredStatusIn(List<JourneyStatus> statuses);

    @Query("""
        SELECT j FROM Journey j
        JOIN FETCH j.booking b
        JOIN FETCH b.train t
        JOIN FETCH b.fromStation
        JOIN FETCH b.toStation
        WHERE (:status IS NULL OR CAST(j.storedStatus AS string) = :status)
          AND (:train IS NULL OR LOWER(t.name) LIKE :trainLike OR t.number = :train)
          AND (:date IS NULL OR CAST(b.travelDate AS string) = :date)
          AND (:passenger IS NULL OR CAST(b.userId AS string) = :passenger)
        ORDER BY j.createdAt DESC
        """)
    Page<Journey> findAllAdmin(@Param("status") String status,
                                @Param("train") String train,
                                @Param("trainLike") String trainLike,
                                @Param("date") String date,
                                @Param("passenger") String passenger,
                                Pageable pageable);

    @Query("""
        SELECT j FROM Journey j
        WHERE (:status IS NULL OR CAST(j.storedStatus AS string) = :status)
          AND (:train IS NULL OR EXISTS (
              SELECT 1 FROM Booking b WHERE b.id = j.booking.id AND (
                  LOWER(b.train.name) LIKE :trainLike OR b.train.number = :train)
          ))
          AND (:date IS NULL OR EXISTS (
              SELECT 1 FROM Booking b WHERE b.id = j.booking.id AND CAST(b.travelDate AS string) = :date
          ))
          AND (:passenger IS NULL OR CAST(j.userId AS string) = :passenger)
        ORDER BY j.createdAt DESC
        """)
    Page<Journey> findAllAdminSimple(@Param("status") String status,
                                      @Param("train") String train,
                                      @Param("trainLike") String trainLike,
                                      @Param("date") String date,
                                      @Param("passenger") String passenger,
                                      Pageable pageable);

    @Query(value = """
        SELECT CAST(b.travel_date AS CHAR) AS date,
               COUNT(CASE WHEN j.stored_status = 'REBOOKED' THEN 1 END) AS rebooked,
               COUNT(*) AS disrupted
        FROM journeys j
        JOIN bookings b ON b.id = j.booking_id
        WHERE j.stored_status IN ('REBOOKED','DISRUPTED')
          AND b.travel_date BETWEEN :from AND :to
        GROUP BY b.travel_date ORDER BY b.travel_date
        """, nativeQuery = true)
    List<java.util.Map<String, Object>> rebookingStats(
            @Param("from") java.time.LocalDate from,
            @Param("to") java.time.LocalDate to);
}

