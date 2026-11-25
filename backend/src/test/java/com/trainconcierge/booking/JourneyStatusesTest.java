package com.trainconcierge.booking;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class JourneyStatusesTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 28, 12, 0);

    @Test
    void upcomingActiveAndCompletedFollowTheClock() {
        assertThat(JourneyStatuses.effective(JourneyStatus.UPCOMING,
                NOW.plusHours(2), NOW.plusHours(5), NOW)).isEqualTo(JourneyStatus.UPCOMING);
        assertThat(JourneyStatuses.effective(JourneyStatus.UPCOMING,
                NOW.minusHours(1), NOW.plusHours(2), NOW)).isEqualTo(JourneyStatus.ACTIVE);
        assertThat(JourneyStatuses.effective(JourneyStatus.UPCOMING,
                NOW.minusDays(2), NOW.minusDays(1), NOW)).isEqualTo(JourneyStatus.COMPLETED);
    }

    @Test
    void storedStatesWinOverTheClock() {
        for (JourneyStatus stored : new JourneyStatus[]{
                JourneyStatus.CANCELLED, JourneyStatus.DISRUPTED,
                JourneyStatus.REBOOKED, JourneyStatus.COMPLETED}) {
            assertThat(JourneyStatuses.effective(stored,
                    NOW.plusHours(2), NOW.plusHours(5), NOW)).isEqualTo(stored);
        }
    }

    @Test
    void boardingExactlyNowIsActiveAndArrivalExactlyNowIsNot() {
        assertThat(JourneyStatuses.effective(JourneyStatus.UPCOMING,
                NOW, NOW.plusHours(1), NOW)).isEqualTo(JourneyStatus.ACTIVE);
    }
}
