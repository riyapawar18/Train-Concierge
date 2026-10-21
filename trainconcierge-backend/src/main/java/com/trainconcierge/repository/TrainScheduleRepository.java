package com.trainconcierge.repository;

import com.trainconcierge.entity.TrainSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TrainScheduleRepository extends JpaRepository<TrainSchedule, Long> {

    Optional<TrainSchedule> findByTrainNumberIgnoreCase(String trainNumber);

    boolean existsByTrainNumberIgnoreCase(String trainNumber);

    /**
     * Core route-stop search query.
     *
     * Finds all active trains where:
     *   1. A stop with stationCode matching the "from" input exists (src stop).
     *   2. A stop with stationCode matching the "to" input exists (dst stop).
     *   3. The src stop sequence is STRICTLY less than the dst stop sequence.
     *
     * Inputs are matched case-insensitively against stationCode.
     * This handles trains that do not originate or terminate at the selected stations.
     */
    @Query("""
            SELECT DISTINCT ts
            FROM TrainSchedule ts
            JOIN ts.stops src ON UPPER(src.stationCode) = UPPER(:fromCode)
            JOIN ts.stops dst ON UPPER(dst.stationCode) = UPPER(:toCode)
            WHERE ts.active = true
              AND src.stopSequence < dst.stopSequence
            ORDER BY ts.trainNumber
            """)
    List<TrainSchedule> findTrainsBetweenStations(
            @Param("fromCode") String fromCode,
            @Param("toCode") String toCode);

    /**
     * Same as above but also filters by running day.
     * dayOfWeek: 1=Monday … 7=Sunday (ISO 8601).
     * Only returns trains whose runningDays string contains the given day digit.
     */
    @Query("""
            SELECT DISTINCT ts
            FROM TrainSchedule ts
            JOIN ts.stops src ON UPPER(src.stationCode) = UPPER(:fromCode)
            JOIN ts.stops dst ON UPPER(dst.stationCode) = UPPER(:toCode)
            WHERE ts.active = true
              AND src.stopSequence < dst.stopSequence
              AND (ts.runningDays IS NULL
                   OR ts.runningDays LIKE CONCAT('%', :dayOfWeek, '%'))
            ORDER BY ts.trainNumber
            """)
    List<TrainSchedule> findTrainsBetweenStationsOnDay(
            @Param("fromCode") String fromCode,
            @Param("toCode") String toCode,
            @Param("dayOfWeek") String dayOfWeek);

    long countByDataSource(String dataSource);

    long countByActive(boolean active);
}
