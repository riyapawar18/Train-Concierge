package com.trainconcierge.travel;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SeatInventoryRepository extends JpaRepository<SeatInventory, Long> {

    @EntityGraph(attributePaths = "coach")
    List<SeatInventory> findByTrainNumberAndTravelDateAndCoachIdOrderBySeatNoAsc(
            String trainNumber, LocalDate travelDate, Long coachId);

    Optional<SeatInventory> findByTrainNumberAndTravelDateAndCoachIdAndSeatNo(
            String trainNumber, LocalDate travelDate, Long coachId, int seatNo);

    List<SeatInventory> findByHeldByAndStatusOrderByHeldUntilAsc(Long heldBy, SeatStatus status);

    Optional<SeatInventory> findByIdAndHeldByAndStatus(Long id, Long heldBy, SeatStatus status);

    @Query("""
            select s.coach.id as coachId, count(s) as total
            from SeatInventory s
            where s.trainNumber = :trainNumber and s.travelDate = :travelDate
            group by s.coach.id
            """)
    List<CoachSeatCount> countSeatsByCoach(@Param("trainNumber") String trainNumber,
                                           @Param("travelDate") LocalDate travelDate);

    @Query("""
            select s.trainNumber as trainNumber, c.classCode as classCode, s.status as status,
                   count(s) as total
            from SeatInventory s
            join s.coach c
            where s.travelDate = :travelDate
            group by s.trainNumber, c.classCode, s.status
            """)
    List<ClassStatusCount> countByDateGrouped(@Param("travelDate") LocalDate travelDate);

    @Query("""
            select s.trainNumber as trainNumber, c.classCode as classCode, s.status as status,
                   count(s) as total
            from SeatInventory s
            join s.coach c
            where s.trainNumber = :trainNumber and s.travelDate = :travelDate
            group by s.trainNumber, c.classCode, s.status
            """)
    List<ClassStatusCount> countByTrainAndDateGrouped(@Param("trainNumber") String trainNumber,
                                                      @Param("travelDate") LocalDate travelDate);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update SeatInventory s
            set s.status = :available, s.heldBy = null, s.heldUntil = null, s.version = s.version + 1
            where s.status = :held and s.heldUntil < :now
            """)
    int releaseExpired(@Param("held") SeatStatus held,
                       @Param("available") SeatStatus available,
                       @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update SeatInventory s
            set s.status = :available, s.heldBy = null, s.heldUntil = null, s.version = s.version + 1
            where s.trainNumber = :trainNumber and s.travelDate = :travelDate
              and s.status = :held and s.heldUntil < :now
            """)
    int releaseExpiredForTrain(@Param("trainNumber") String trainNumber,
                               @Param("travelDate") LocalDate travelDate,
                               @Param("held") SeatStatus held,
                               @Param("available") SeatStatus available,
                               @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update SeatInventory s
            set s.status = :available, s.heldBy = null, s.heldUntil = null, s.version = s.version + 1
            where s.heldBy = :userId and s.status = :held and s.heldUntil < :now
            """)
    int releaseExpiredForUser(@Param("userId") Long userId,
                              @Param("held") SeatStatus held,
                              @Param("available") SeatStatus available,
                              @Param("now") LocalDateTime now);

    interface CoachSeatCount {
        Long getCoachId();

        long getTotal();
    }

    interface ClassStatusCount {
        String getTrainNumber();

        String getClassCode();

        SeatStatus getStatus();

        long getTotal();
    }
}
