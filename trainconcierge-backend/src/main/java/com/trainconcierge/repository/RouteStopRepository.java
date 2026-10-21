package com.trainconcierge.repository;

import com.trainconcierge.entity.RouteStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteStopRepository extends JpaRepository<RouteStop, Long> {

    List<RouteStop> findByTrainScheduleIdOrderByStopSequenceAsc(Long trainScheduleId);

    Optional<RouteStop> findByTrainScheduleIdAndStationCodeIgnoreCase(
            Long trainScheduleId, String stationCode);

    boolean existsByTrainScheduleIdAndStationCodeIgnoreCase(
            Long trainScheduleId, String stationCode);

    @Modifying
    @Transactional
    @Query("DELETE FROM RouteStop rs WHERE rs.trainSchedule.id = :trainScheduleId")
    void deleteByTrainScheduleId(@Param("trainScheduleId") Long trainScheduleId);

    long countByTrainScheduleId(Long trainScheduleId);
}
