package com.trainconcierge.disruption.rules;

import com.trainconcierge.catalog.TrainType;
import com.trainconcierge.disruption.DisruptionProperties;
import com.trainconcierge.disruption.RecommendationKind;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Set;

@Component
@Order(80)
public class TrainTypePreferenceRule implements RecommendationRule {

    private static final Set<TrainType> PREFERRED = EnumSet.of(TrainType.RAJDHANI,
            TrainType.SHATABDI, TrainType.VANDE_BHARAT);

    private final DisruptionProperties properties;

    public TrainTypePreferenceRule(DisruptionProperties properties) {
        this.properties = properties;
    }

    @Override
    public boolean appliesTo(RecommendationKind kind) {
        return kind == RecommendationKind.TRAIN;
    }

    @Override
    public RuleResult evaluate(RecommendationContext context, RecommendationCandidate candidate) {
        if (candidate.trainType() != null && PREFERRED.contains(candidate.trainType())) {
            return RuleResult.scored(properties.getTrainTypePoints(),
                    "Preferred premium train");
        }
        return RuleResult.pass();
    }
}
