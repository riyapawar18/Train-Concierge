package com.trainconcierge.disruption.rules;

import com.trainconcierge.disruption.DisruptionProperties;
import com.trainconcierge.disruption.RecommendationKind;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(70)
public class DirectServiceRule implements RecommendationRule {

    private final DisruptionProperties properties;

    public DirectServiceRule(DisruptionProperties properties) {
        this.properties = properties;
    }

    @Override
    public boolean appliesTo(RecommendationKind kind) {
        return kind == RecommendationKind.TRAIN || kind == RecommendationKind.BUS;
    }

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        if (candidate.direct()) {
            return RuleResult.scored(properties.getDirectServicePoints(),
                    "Direct service, no change on the way");
        }
        return RuleResult.pass();
    }
}
