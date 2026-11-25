package com.trainconcierge.disruption;

import com.trainconcierge.catalog.TrainType;
import com.trainconcierge.disruption.rules.EarlierArrivalRule;
import com.trainconcierge.disruption.rules.FareWithinToleranceRule;
import com.trainconcierge.disruption.rules.HigherClassRule;
import com.trainconcierge.disruption.rules.LowerClassRule;
import com.trainconcierge.disruption.rules.OvernightRule;
import com.trainconcierge.disruption.rules.ReachabilityRule;
import com.trainconcierge.disruption.rules.RecommendationCandidate;
import com.trainconcierge.disruption.rules.RecommendationContext;
import com.trainconcierge.disruption.rules.RuleResult;
import com.trainconcierge.disruption.rules.SameClassRule;
import com.trainconcierge.disruption.rules.SeatAvailabilityRule;
import com.trainconcierge.disruption.rules.TrainTypePreferenceRule;
import com.trainconcierge.disruption.rules.WaitOptionRule;
import com.trainconcierge.travel.Quota;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RecommendationRulesTest {

    private static final LocalDateTime BOARDING = LocalDateTime.of(2026, 11, 12, 16, 30);
    private static final LocalDateTime ORIGINAL_ARRIVAL = LocalDateTime.of(2026, 11, 12, 19, 45);
    private static final DisruptionProperties PROPERTIES = new DisruptionProperties();

    @Test
    void reachabilityRejectsCandidatesThatDepartTooSoon() {
        ReachabilityRule rule = new ReachabilityRule();
        assertThat(rule.evaluate(context(false), candidate(BOARDING.plusMinutes(10))).eligible())
                .isFalse();
        assertThat(rule.evaluate(context(false), candidate(BOARDING.plusMinutes(90))).eligible())
                .isTrue();
    }

    @Test
    void seatAvailabilityRejectsPartiesThatDoNotFit() {
        SeatAvailabilityRule rule = new SeatAvailabilityRule();
        RecommendationCandidate tooSmall = candidate(BOARDING.plusHours(2), 1);
        assertThat(rule.evaluate(context(false), tooSmall).eligible()).isFalse();
        assertThat(rule.evaluate(context(false), candidate(BOARDING.plusHours(2), 2)).eligible())
                .isTrue();
    }

    @Test
    void earlierArrivalRewardsCandidatesThatBeatTheDelayedTrain() {
        EarlierArrivalRule rule = new EarlierArrivalRule(PROPERTIES);
        LocalDateTime delayedArrival = ORIGINAL_ARRIVAL.plusMinutes(195);
        RecommendationCandidate faster = candidate(BOARDING.plusHours(1), 2, "3A",
                BOARDING.plusHours(3), new BigDecimal("1500"));
        RuleResult result = rule.evaluate(context(false, delayedArrival), faster);
        assertThat(result.eligible()).isTrue();
        assertThat(result.scoreDelta()).isEqualTo(PROPERTIES.getEarlierArrivalPoints()
                + PROPERTIES.getSavingsCapPoints());
        assertThat(result.reason()).contains("earlier");

        RecommendationCandidate later = candidate(BOARDING.plusHours(2), 2, "3A",
                delayedArrival.plusHours(1), new BigDecimal("1500"));
        assertThat(rule.evaluate(context(false, delayedArrival), later).scoreDelta()).isZero();
    }

    @Test
    void classRulesRewardLikeClassesAndWarnOnChanges() {
        RecommendationContext context = context(false);
        assertThat(new SameClassRule(PROPERTIES)
                .evaluate(context, candidate(BOARDING.plusHours(2), 2, "3A")).scoreDelta())
                .isEqualTo(PROPERTIES.getSameClassPoints());
        RuleResult higher = new HigherClassRule(PROPERTIES)
                .evaluate(context, candidate(BOARDING.plusHours(2), 2, "2A"));
        assertThat(higher.scoreDelta()).isEqualTo(PROPERTIES.getHigherClassPoints());
        assertThat(higher.warning()).isEqualTo("Higher fare");
        RuleResult lower = new LowerClassRule(PROPERTIES)
                .evaluate(context, candidate(BOARDING.plusHours(2), 2, "SL"));
        assertThat(lower.scoreDelta()).isEqualTo(PROPERTIES.getLowerClassPoints());
        assertThat(lower.warning()).contains("Lower class");
    }

    @Test
    void fareToleranceOnlyRewardsComparablePrices() {
        FareWithinToleranceRule rule = new FareWithinToleranceRule(PROPERTIES);
        RecommendationContext context = context(false);
        assertThat(rule.evaluate(context, candidate(BOARDING.plusHours(2), 2, "3A",
                BOARDING.plusHours(5), new BigDecimal("1450"))).scoreDelta())
                .isEqualTo(PROPERTIES.getFareWithinPoints());
        assertThat(rule.evaluate(context, candidate(BOARDING.plusHours(2), 2, "3A",
                BOARDING.plusHours(5), new BigDecimal("2450"))).scoreDelta()).isZero();
    }

    @Test
    void preferredTrainTypesScoreHigher() {
        TrainTypePreferenceRule rule = new TrainTypePreferenceRule(PROPERTIES);
        RecommendationCandidate vandeBharat = new RecommendationCandidate(
                RecommendationKind.TRAIN, "20901", null, "Vande Bharat", "CC", "PUNE", "CSMT",
                BOARDING.plusHours(2), BOARDING.plusHours(5), new BigDecimal("1500"), 40,
                true, TrainType.VANDE_BHARAT, 180);
        assertThat(rule.evaluate(context(false), vandeBharat).scoreDelta())
                .isEqualTo(PROPERTIES.getTrainTypePoints());
        assertThat(rule.evaluate(context(false), candidate(BOARDING.plusHours(2))).scoreDelta())
                .isZero();
    }

    @Test
    void overnightAddsAHotelWarningWithoutChangingTheScore() {
        RuleResult result = new OvernightRule().evaluate(context(true), candidate(BOARDING.plusHours(2)));
        assertThat(result.eligible()).isTrue();
        assertThat(result.scoreDelta()).isZero();
        assertThat(result.warning()).contains("hotel");
    }

    @Test
    void waitOptionsAreOnlyOfferedForShortDelays() {
        WaitOptionRule rule = new WaitOptionRule(PROPERTIES);
        assertThat(rule.options(context(false, ORIGINAL_ARRIVAL.plusMinutes(30))))
                .hasSize(1);
        assertThat(rule.options(context(false))).isEmpty();
        assertThat(rule.options(context(true, ORIGINAL_ARRIVAL.plusMinutes(30), true)))
                .isEmpty();
    }

    private static RecommendationContext context(boolean needsHotel) {
        return context(needsHotel, ORIGINAL_ARRIVAL.plusMinutes(195));
    }

    private static RecommendationContext context(boolean needsHotel, LocalDateTime newArrival) {
        return context(needsHotel, newArrival, false);
    }

    private static RecommendationContext context(boolean needsHotel, LocalDateTime newArrival,
                                                 boolean cancellation) {
        return new RecommendationContext(
                1L, 10L, "11007", "Deccan Express", LocalDate.of(2026, 11, 12), BOARDING,
                ORIGINAL_ARRIVAL, newArrival, BOARDING, BOARDING.plusMinutes(50),
                (int) java.time.Duration.between(ORIGINAL_ARRIVAL, newArrival).toMinutes(),
                2, "3A", new BigDecimal("1600.00"), Quota.GENERAL, cancellation, needsHotel,
                java.time.Duration.between(BOARDING, newArrival).toMinutes(),
                "PUNE", "Pune", "CSMT", "Mumbai");
    }

    private static RecommendationCandidate candidate(LocalDateTime departure) {
        return candidate(departure, 4);
    }

    private static RecommendationCandidate candidate(LocalDateTime departure, int seats) {
        return candidate(departure, seats, "3A", departure.plusHours(3), new BigDecimal("1600.00"));
    }

    private static RecommendationCandidate candidate(LocalDateTime departure, int seats,
                                                     String classCode) {
        return candidate(departure, seats, classCode, departure.plusHours(3),
                new BigDecimal("1600.00"));
    }

    private static RecommendationCandidate candidate(LocalDateTime departure, int seats,
                                                     String classCode, LocalDateTime arrival,
                                                     BigDecimal fare) {
        return new RecommendationCandidate(RecommendationKind.TRAIN, "12169", null,
                "Solapur Mumbai Express", classCode, "PUNE", "CSMT", departure, arrival, fare,
                seats, true, TrainType.EXPRESS,
                java.time.Duration.between(departure, arrival).toMinutes());
    }
}
