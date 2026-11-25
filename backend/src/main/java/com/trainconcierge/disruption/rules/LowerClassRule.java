package com.trainconcierge.disruption.rules;

import com.trainconcierge.disruption.DisruptionProperties;
import com.trainconcierge.disruption.RecommendationKind;
import com.trainconcierge.travel.TravelClasses;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(50)
public class LowerClassRule implements RecommendationRule {

    private final DisruptionProperties properties;

    public LowerClassRule(DisruptionProperties properties) {
        this.properties = properties;
    }

    @Override
    public boolean appliesTo(RecommendationKind kind) {
        return kind == RecommendationKind.TRAIN;
    }

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        if (candidate.classCode() != null
                && TravelClasses.order(candidate.classCode())
                > TravelClasses.order(context.bookedClass())) {
            return RuleResult.scored(properties.getLowerClassPoints(), null,
                    "Lower class than booked");
        }
        return RuleResult.pass();
    }
}
