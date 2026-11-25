package com.trainconcierge.disruption.rules;

import com.trainconcierge.disruption.DisruptionProperties;
import com.trainconcierge.disruption.RecommendationKind;
import com.trainconcierge.travel.TravelClasses;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(40)
public class SameClassRule implements RecommendationRule {

    private final DisruptionProperties properties;

    public SameClassRule(DisruptionProperties properties) {
        this.properties = properties;
    }

    @Override
    public boolean appliesTo(RecommendationKind kind) {
        return kind == RecommendationKind.TRAIN;
    }

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        if (candidate.classCode() != null
                && candidate.classCode().equalsIgnoreCase(context.bookedClass())) {
            return RuleResult.scored(properties.getSameClassPoints(),
                    "Same class as your booked ticket");
        }
        return RuleResult.pass();
    }
}
