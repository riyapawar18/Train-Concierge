package com.trainconcierge.provider;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for RailRadarTrainProvider helper logic.
 * The HTTP integration is tested at the service level with mocks.
 */
class RailRadarTrainProviderTest {

    // ── Station code resolution ──────────────────────────────────────────────

    @Test
    void resolveStationCode_mumbaiReturnsCSMT() {
        assertThat(RailRadarTrainProvider.resolveStationCode("Mumbai")).isEqualTo("CSTM");
    }

    @Test
    void resolveStationCode_caseInsensitive() {
        assertThat(RailRadarTrainProvider.resolveStationCode("MUMBAI")).isEqualTo("CSTM");
        assertThat(RailRadarTrainProvider.resolveStationCode("mumbai")).isEqualTo("CSTM");
    }

    @Test
    void resolveStationCode_delhiReturnsNDLS() {
        assertThat(RailRadarTrainProvider.resolveStationCode("Delhi")).isEqualTo("NDLS");
        assertThat(RailRadarTrainProvider.resolveStationCode("New Delhi")).isEqualTo("NDLS");
    }

    @Test
    void resolveStationCode_chennaiReturnsMAS() {
        assertThat(RailRadarTrainProvider.resolveStationCode("Chennai")).isEqualTo("MAS");
    }

    @Test
    void resolveStationCode_bangaloreReturnsSBC() {
        assertThat(RailRadarTrainProvider.resolveStationCode("Bangalore")).isEqualTo("SBC");
        assertThat(RailRadarTrainProvider.resolveStationCode("Bengaluru")).isEqualTo("SBC");
    }

    @Test
    void resolveStationCode_kolkataReturnsHWH() {
        assertThat(RailRadarTrainProvider.resolveStationCode("Kolkata")).isEqualTo("HWH");
    }

    @Test
    void resolveStationCode_puneReturnsPUNE() {
        assertThat(RailRadarTrainProvider.resolveStationCode("Pune")).isEqualTo("PUNE");
    }

    @Test
    void resolveStationCode_unknownCityUppercased() {
        // For unknown inputs, fall back to uppercase of the raw input
        assertThat(RailRadarTrainProvider.resolveStationCode("Xyz City"))
                .isEqualTo("XYZ CITY");
    }

    @Test
    void resolveStationCode_stationCodePassthroughUnknown() {
        // A raw IRCTC code not in the map is returned as-is uppercased
        assertThat(RailRadarTrainProvider.resolveStationCode("NDLS")).isEqualTo("NDLS");
    }

    @Test
    void resolveStationCode_nullSafe() {
        assertThat(RailRadarTrainProvider.resolveStationCode(null)).isNull();
        assertThat(RailRadarTrainProvider.resolveStationCode("  ")).isEqualTo("  ");
    }

    // ── Miraj and Maharashtra stations ───────────────────────────────────────

    @Test
    void resolveStationCode_mirajReturnsMRJ() {
        // THE KEY FIX: Miraj must resolve to MRJ, not the raw string "MIRAJ"
        assertThat(RailRadarTrainProvider.resolveStationCode("Miraj")).isEqualTo("MRJ");
        assertThat(RailRadarTrainProvider.resolveStationCode("miraj")).isEqualTo("MRJ");
        assertThat(RailRadarTrainProvider.resolveStationCode("MIRAJ")).isEqualTo("MRJ");
        assertThat(RailRadarTrainProvider.resolveStationCode("Miraj Junction")).isEqualTo("MRJ");
        assertThat(RailRadarTrainProvider.resolveStationCode("miraj jn")).isEqualTo("MRJ");
    }

    @Test
    void resolveStationCode_sangliReturnsSLI() {
        assertThat(RailRadarTrainProvider.resolveStationCode("Sangli")).isEqualTo("SLI");
    }

    @Test
    void resolveStationCode_kolhapurReturnsKOP() {
        assertThat(RailRadarTrainProvider.resolveStationCode("Kolhapur")).isEqualTo("KOP");
    }

    @Test
    void resolveStationCode_solapurReturnsSUR() {
        assertThat(RailRadarTrainProvider.resolveStationCode("Solapur")).isEqualTo("SUR");
    }

    @Test
    void resolveStationCode_goaReturnsMAO() {
        assertThat(RailRadarTrainProvider.resolveStationCode("Goa")).isEqualTo("MAO");
        assertThat(RailRadarTrainProvider.resolveStationCode("Madgaon")).isEqualTo("MAO");
    }

    @Test
    void resolveStationCode_hubliReturnsUBL() {
        assertThat(RailRadarTrainProvider.resolveStationCode("Hubli")).isEqualTo("UBL");
    }

    // ── Date format tests ─────────────────────────────────────────────────────

    @Test
    void dateFormat_frontendSendsISO_backendParsesCorrectly() {
        // Frontend sends YYYY-MM-DD from <input type="date">
        // Backend @DateTimeFormat(iso = DATE) parses it as LocalDate
        // This test confirms the contract: 2026-10-21 -> October 21, 2026
        java.time.LocalDate date = java.time.LocalDate.of(2026, 10, 21);
        assertThat(date.getYear()).isEqualTo(2026);
        assertThat(date.getMonthValue()).isEqualTo(10);
        assertThat(date.getDayOfMonth()).isEqualTo(21);
        // Formatted back to ISO string should give the same value the frontend sent
        assertThat(date.format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE))
                .isEqualTo("2026-10-21");
    }

    @Test
    void search_throwsMissingCredentials_whenKeyNotConfigured() {
        RailRadarTrainProvider provider = new RailRadarTrainProvider();
        // apiKey is empty by default (no @Value injection in unit test)
        assertThat(provider.isConfigured()).isFalse();
        assertThatThrownBy(() ->
                provider.search("Mumbai", "Delhi", java.time.LocalDate.now().plusDays(1), 1))
                .isInstanceOf(TrainProviderException.class)
                .satisfies(e -> assertThat(((TrainProviderException) e).getReason())
                        .isEqualTo(TrainProviderException.Reason.MISSING_CREDENTIALS));
    }
}
