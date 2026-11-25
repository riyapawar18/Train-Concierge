package com.trainconcierge.disruption.rules;

import com.trainconcierge.disruption.RecommendationKind;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(20)
public class SeatAvailabilityRule implements RecommendationRule {

    @Override
    public boolean appliesTo(RecommendationKind kind) {
        return kind == RecommendationKind.TRAIN || kind == RecommendationKind.BUS;
    }

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        if (candidate.seatsAvailable() < context.passengerCount()) {
            return RuleResult.rejected("Not enough seats for your party");
        }
        return RuleResult.pass();
    }
}
