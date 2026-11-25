package com.trainconcierge.travel;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CoachRepository extends JpaRepository<Coach, Long> {

    List<Coach> findByTrainNumberOrderByCoachNoAsc(String trainNumber);

    List<Coach> findByTrainNumberAndClassCodeOrderByCoachNoAsc(String trainNumber, String classCode);

    Optional<Coach> findByIdAndTrainNumber(Long id, String trainNumber);
}
