package com.trainconcierge.disruption.rules;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(120)
public class OvernightRule implements RecommendationRule {

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        if (context.needsHotel()) {
            return RuleResult.scored(0, null,
                    "Overnight journey: hotel suggestions are available");
        }
        return RuleResult.pass();
    }
}
