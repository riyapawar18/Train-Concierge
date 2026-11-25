package com.trainconcierge.disruption.rules;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(110)
public class CancellationRule implements RecommendationRule {

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        if (context.cancellation()) {
            return RuleResult.scored(0, "Full refund applies to your original ticket");
        }
        return RuleResult.pass();
    }
}
