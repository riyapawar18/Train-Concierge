package com.trainconcierge.disruption.rules;

import com.trainconcierge.disruption.DisruptionProperties;
import com.trainconcierge.disruption.RecommendationKind;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(100)
public class WaitOptionRule implements RecommendationRule {

    private final DisruptionProperties properties;

    public WaitOptionRule(DisruptionProperties properties) {
        this.properties = properties;
    }

    @Override
    public boolean appliesTo(RecommendationKind kind) {
        return kind == RecommendationKind.WAIT;
    }

    @Override
    public List<RecommendationCandidate> options(RecommendationContext context) {
        if (context.cancellation() || context.delayMinutes() <= 0
                || context.delayMinutes() >= properties.getShortDelayMinutes()) {
            return List.of();
        }
        return List.of(new RecommendationCandidate(
                RecommendationKind.WAIT,
                null,
                null,
                "Wait for your train",
                context.bookedClass(),
                context.fromStation(),
                context.toStation(),
                context.disruptionTime(),
                context.newArrival(),
                context.originalFare(),
                context.passengerCount(),
                true,
                null,
                context.newDurationMinutes()));
    }

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        return RuleResult.scored(properties.getWaitOptionPoints(),
                "Short delay: your train is still the fastest option");
    }
}
