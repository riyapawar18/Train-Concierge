package com.trainconcierge.disruption.rules;

import com.trainconcierge.disruption.DisruptionProperties;
import com.trainconcierge.disruption.RecommendationKind;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@Order(60)
public class FareWithinToleranceRule implements RecommendationRule {

    private final DisruptionProperties properties;

    public FareWithinToleranceRule(DisruptionProperties properties) {
        this.properties = properties;
    }

    @Override
    public boolean appliesTo(RecommendationKind kind) {
        return kind == RecommendationKind.TRAIN || kind == RecommendationKind.BUS;
    }

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        BigDecimal original = context.originalFare();
        if (original == null || original.signum() <= 0 || candidate.fare() == null) {
            return RuleResult.pass();
        }
        BigDecimal allowed = original
                .multiply(BigDecimal.valueOf(properties.getFareTolerancePercent()))
                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        if (candidate.fare().subtract(original).abs().compareTo(allowed) <= 0) {
            return RuleResult.scored(properties.getFareWithinPoints(),
                    "Fare within " + properties.getFareTolerancePercent() + "% of what you paid");
        }
        return RuleResult.pass();
    }
}
