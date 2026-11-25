package com.trainconcierge.disruption.rules;

import com.trainconcierge.disruption.RecommendationKind;

public interface RecommendationRule {

    default boolean appliesTo(RecommendationKind kind) {
        return kind != RecommendationKind.WAIT;
    }

    RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate);

    default java.util.List<RecommendationCandidate> options(RecommendationContext context) {
        return java.util.List.of();
    }
}
