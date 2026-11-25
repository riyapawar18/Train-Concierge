package com.trainconcierge.disruption.rules;

import com.trainconcierge.disruption.DisruptionProperties;
import com.trainconcierge.disruption.ImpactText;
import com.trainconcierge.disruption.RecommendationKind;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@Order(30)
public class EarlierArrivalRule implements RecommendationRule {

    private final DisruptionProperties properties;

    public EarlierArrivalRule(DisruptionProperties properties) {
        this.properties = properties;
    }

    @Override
    public boolean appliesTo(RecommendationKind kind) {
        return kind == RecommendationKind.TRAIN || kind == RecommendationKind.BUS;
    }

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        if (context.newArrival() == null || !candidate.arrivalAt().isBefore(context.newArrival())) {
            return RuleResult.pass();
        }
        long saved = Duration.between(candidate.arrivalAt(), context.newArrival()).toMinutes();
        int steps = (int) (saved / Math.max(1, properties.getSavingsStepMinutes()));
        int bonus = Math.min(properties.getSavingsCapPoints(),
                steps * properties.getSavingsStepPoints());
        String reason = "Arrives " + ImpactText.duration((int) saved)
                + " earlier than your delayed train";
        return RuleResult.scored(properties.getEarlierArrivalPoints() + bonus, reason);
    }
}
