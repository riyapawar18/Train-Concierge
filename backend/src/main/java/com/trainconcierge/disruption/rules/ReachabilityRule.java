package com.trainconcierge.disruption.rules;

import com.trainconcierge.disruption.RecommendationKind;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(10)
public class ReachabilityRule implements RecommendationRule {

    @Override
    public boolean appliesTo(RecommendationKind kind) {
        return kind == RecommendationKind.TRAIN || kind == RecommendationKind.BUS;
    }

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        if (candidate.departureAt().isBefore(context.earliestDeparture())) {
            return RuleResult.rejected("Departs before you can reach the station");
        }
        return RuleResult.pass();
    }
}
