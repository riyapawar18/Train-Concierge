package com.trainconcierge.disruption.rules;

public record RuleResult(boolean eligible, int scoreDelta, String reason, String warning) {

    public static RuleResult pass() {
        return new RuleResult(true, 0, null, null);
    }

    public static RuleResult scored(int scoreDelta, String reason) {
        return new RuleResult(true, scoreDelta, reason, null);
    }

    public static RuleResult scored(int scoreDelta, String reason, String warning) {
        return new RuleResult(true, scoreDelta, reason, warning);
    }

    public static RuleResult rejected(String reason) {
        return new RuleResult(false, 0, reason, null);
    }
}
