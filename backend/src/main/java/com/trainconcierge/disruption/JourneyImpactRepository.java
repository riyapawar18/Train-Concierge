package com.trainconcierge.disruption;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface JourneyImpactRepository extends JpaRepository<JourneyImpact, Long> {

    @EntityGraph(attributePaths = {"disruption", "disruption.train", "journey", "booking",
            "booking.train", "booking.fromStation", "booking.toStation", "booking.passengers"})
    List<JourneyImpact> findByDisruptionIdOrderByCreatedAtAsc(Long disruptionId);

    Optional<JourneyImpact> findByDisruptionIdAndBookingId(Long disruptionId, Long bookingId);

    @EntityGraph(attributePaths = {"disruption", "disruption.train", "journey", "booking",
            "booking.train", "booking.fromStation", "booking.toStation"})
    Optional<JourneyImpact> findFirstByJourneyIdOrderByCreatedAtDesc(Long journeyId);

    long countByDisruptionId(Long disruptionId);

    @Query("""
            select i from JourneyImpact i
            join fetch i.disruption d
            join fetch i.journey j
            join fetch i.booking b
            join fetch b.train
            join fetch b.fromStation
            join fetch b.toStation
            where b.userId = :userId
              and (:status is null or d.status = :status)
            order by d.createdAt desc, i.id desc
            """)
    List<JourneyImpact> findForUser(@Param("userId") Long userId,
                                    @Param("status") DisruptionStatus status);

    @Query("""
            select i from JourneyImpact i
            join fetch i.disruption
            where i.journey.id = :journeyId
            """)
    List<JourneyImpact> findByJourneyId(@Param("journeyId") Long journeyId);

    List<JourneyImpact> findByDisruptionIdIn(Collection<Long> disruptionIds);

    @Query("""
            select i from JourneyImpact i
            where i.journey.id = :journeyId and i.disruption.status = :status
            """)
    List<JourneyImpact> findByJourneyIdAndDisruptionStatus(@Param("journeyId") Long journeyId,
                                                          @Param("status") DisruptionStatus status);

    long countByDisruptionStatus(DisruptionStatus status);

    @Query(value = """
        SELECT CAST(b.travel_date AS CHAR) AS date,
               COUNT(DISTINCT i.booking_id) AS bookings,
               SUM(CASE WHEN b.status = 'CONFIRMED' THEN 1 ELSE 0 END) AS passengers
        FROM journey_impacts i
        JOIN bookings b ON b.id = i.booking_id
        JOIN disruptions d ON d.id = i.disruption_id
        WHERE d.travel_date BETWEEN :from AND :to
        GROUP BY b.travel_date ORDER BY b.travel_date
        """, nativeQuery = true)
    List<java.util.Map<String, Object>> affectedPassengers(
            @Param("from") java.time.LocalDate from,
            @Param("to") java.time.LocalDate to);

    @Query(value = """
        SELECT COALESCE(hi.verdict, 'UNKNOWN') AS verdict, COUNT(*) AS count
        FROM hotel_impacts hi
        JOIN journey_impacts ji ON ji.id = hi.impact_id
        JOIN disruptions d ON d.id = ji.disruption_id
        WHERE d.travel_date BETWEEN :from AND :to
        GROUP BY hi.verdict ORDER BY count DESC
        """, nativeQuery = true)
    List<java.util.Map<String, Object>> hotelVerdictDistribution(
            @Param("from") java.time.LocalDate from,
            @Param("to") java.time.LocalDate to);
}
