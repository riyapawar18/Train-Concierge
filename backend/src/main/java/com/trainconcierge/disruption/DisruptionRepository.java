package com.trainconcierge.disruption;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DisruptionRepository extends JpaRepository<Disruption, Long> {

    Optional<Disruption> findFirstByTrain_NumberAndTravelDateAndStatusOrderByIdDesc(
            String trainNumber, LocalDate travelDate, DisruptionStatus status);

    boolean existsByTrain_NumberAndTravelDateAndStatus(String trainNumber, LocalDate travelDate,
                                                       DisruptionStatus status);

    @Query("""
            select d from Disruption d
            where (:status is null or d.status = :status)
              and (:train is null or lower(d.train.number) like lower(concat('%', :train, '%')))
              and (:date is null or d.travelDate = :date)
            order by d.createdAt desc, d.id desc
            """)
    List<Disruption> search(@Param("status") DisruptionStatus status,
                            @Param("train") String train,
                            @Param("date") LocalDate date);

    @Query("""
            select d from Disruption d
            where d.train.number = :trainNumber and d.travelDate = :travelDate
              and d.status = :status
            """)
    List<Disruption> findForTrainAndDate(@Param("trainNumber") String trainNumber,
                                         @Param("travelDate") LocalDate travelDate,
                                         @Param("status") DisruptionStatus status);

    long countByStatus(DisruptionStatus status);

    @Query(value = """
        SELECT CAST(d.travel_date AS CHAR) AS date,
               COUNT(*) AS count,
               COALESCE(AVG(d.delay_minutes), 0) AS avgDelay
        FROM disruptions d
        WHERE d.travel_date BETWEEN :from AND :to
        GROUP BY d.travel_date ORDER BY d.travel_date
        """, nativeQuery = true)
    List<java.util.Map<String, Object>> delayTrend(
            @Param("from") LocalDate from);

    @Query(value = """
        SELECT CAST(d.travel_date AS CHAR) AS date,
               COUNT(*) AS count,
               COALESCE(AVG(d.delay_minutes), 0) AS avgDelay
        FROM disruptions d
        WHERE d.travel_date BETWEEN :from AND :to
        GROUP BY d.travel_date ORDER BY d.travel_date
        """, nativeQuery = true)
    List<java.util.Map<String, Object>> disruptions(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
