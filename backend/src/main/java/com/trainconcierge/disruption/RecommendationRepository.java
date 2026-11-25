package com.trainconcierge.disruption;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {

    List<Recommendation> findByImpactIdOrderByRankAsc(Long impactId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT r FROM Recommendation r WHERE r.impact.journey.id = :journeyId ORDER BY r.rank ASC")
    List<Recommendation> findAllByJourneyId(Long journeyId);

    long countByImpactId(Long impactId);

    void deleteByImpactId(Long impactId);
}
