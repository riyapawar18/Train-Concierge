package com.trainconcierge.disruption.rules;

import com.trainconcierge.disruption.DisruptionProperties;
import com.trainconcierge.disruption.RecommendationKind;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(90)
public class BusDurationRule implements RecommendationRule {

    private final DisruptionProperties properties;

    public BusDurationRule(DisruptionProperties properties) {
        this.properties = properties;
    }

    @Override
    public boolean appliesTo(RecommendationKind kind) {
        return kind == RecommendationKind.BUS;
    }

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        if (candidate.durationMinutes() < context.newDurationMinutes()) {
            return RuleResult.scored(properties.getBusDurationPoints(),
                    "Reaches sooner than your delayed train");
        }
        if (candidate.durationMinutes() > context.newDurationMinutes()) {
            return RuleResult.scored(-properties.getBusDurationPoints(), null,
                    "Longer journey than your delayed train");
        }
        return RuleResult.pass();
    }
}
