package com.trainconcierge.disruption;

import java.util.List;

/**
 * Phase 09 replaces the no-op implementation with email and in-app notifications.
 */
public interface DisruptionNotifier {

    default void onCreated(Disruption disruption, List<JourneyImpact> impacts) {
    }

    default void onUpdated(Disruption disruption, List<JourneyImpact> impacts) {
    }

    default void onResolved(Disruption disruption) {
    }
}
