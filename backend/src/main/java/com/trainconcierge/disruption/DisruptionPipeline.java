package com.trainconcierge.disruption;

import com.trainconcierge.common.error.ApiException;
import com.trainconcierge.hotel.HotelImpactAnalyzer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DisruptionPipeline {

    private final DisruptionRepository disruptionRepository;
    private final ImpactAnalysisService impactAnalysisService;
    private final RecommendationEngine recommendationEngine;
    private final DisruptionNotifier notifier;
    private final HotelImpactAnalyzer hotelImpactAnalyzer;

    public DisruptionPipeline(DisruptionRepository disruptionRepository,
                              ImpactAnalysisService impactAnalysisService,
                              RecommendationEngine recommendationEngine,
                              DisruptionNotifier notifier,
                              HotelImpactAnalyzer hotelImpactAnalyzer) {
        this.disruptionRepository = disruptionRepository;
        this.impactAnalysisService = impactAnalysisService;
        this.recommendationEngine = recommendationEngine;
        this.notifier = notifier;
        this.hotelImpactAnalyzer = hotelImpactAnalyzer;
    }

    /**
     * Runs after the admin transaction commits. REQUIRES_NEW is essential: during the
     * after-commit callback the original transaction is still bound to the thread, and
     * joining it would mean writing impacts into a transaction that has already committed.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onCreated(Long disruptionId) {
        Disruption disruption = require(disruptionId);
        List<JourneyImpact> impacts = impactAnalysisService.analyze(disruption);
        for (JourneyImpact impact : impacts) {
            recommendationEngine.generate(impact);
            hotelImpactAnalyzer.analyze(impact);
        }
        notifier.onCreated(disruption, impacts);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onUpdated(Long disruptionId) {
        Disruption disruption = require(disruptionId);
        List<JourneyImpact> impacts = impactAnalysisService.analyze(disruption);
        for (JourneyImpact impact : impacts) {
            recommendationEngine.generate(impact);
            hotelImpactAnalyzer.analyze(impact);
        }
        notifier.onUpdated(disruption, impacts);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onResolved(Long disruptionId) {
        notifier.onResolved(require(disruptionId));
    }

    private Disruption require(Long disruptionId) {
        return disruptionRepository.findById(disruptionId).orElseThrow(ApiException::notFound);
    }
}
