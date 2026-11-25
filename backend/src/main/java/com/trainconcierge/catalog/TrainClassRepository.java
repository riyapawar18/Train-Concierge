package com.trainconcierge.catalog;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TrainClassRepository extends JpaRepository<TrainClass, Long> {

    List<TrainClass> findByTrainNumberOrderByBaseFareAsc(String trainNumber);

    Optional<TrainClass> findByTrainNumberAndClassCode(String trainNumber, String classCode);

    @Override
    @EntityGraph(attributePaths = "train")
    List<TrainClass> findAll();
}
