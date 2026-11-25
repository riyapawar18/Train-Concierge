package com.trainconcierge.catalog;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrainScheduleRepository extends JpaRepository<TrainSchedule, Long> {

    @EntityGraph(attributePaths = "station")
    List<TrainSchedule> findByTrainNumberOrderByStopOrder(String trainNumber);

    @Override
    @EntityGraph(attributePaths = {"train", "station"})
    List<TrainSchedule> findAll();
}
