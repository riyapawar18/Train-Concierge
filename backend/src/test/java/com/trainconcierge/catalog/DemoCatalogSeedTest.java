package com.trainconcierge.catalog;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = {
        "app.demo.password=Str0ng#Pass",
        "spring.datasource.url=jdbc:h2:mem:catalog-seed;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER"
})
@ActiveProfiles({"test", "demo"})
class DemoCatalogSeedTest {

    private static final String[] COUNTED_TABLES = {
            "stations", "trains", "train_schedule", "train_classes", "coaches",
            "seat_inventory", "bus_services", "bus_trips", "hotels", "hotel_policies",
            "hotel_rooms", "room_availability", "settings"
    };

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private DemoCatalogSeeder demoCatalogSeeder;

    @Test
    void demoProfileFillsEveryCatalogTable() {
        assertThat(count("stations")).isEqualTo(29);
        assertThat(count("trains")).isEqualTo(25);
        assertThat(count("train_schedule")).isEqualTo(111);
        assertThat(count("train_classes")).isEqualTo(72);
        assertThat(count("coaches")).isEqualTo(100);
        // The catalog seeds today..+13; the demo journey seeder adds the past 12007 date
        // (72 CC + 56 EC seats) so the completed demo journey has inventory.
        assertThat(count("seat_inventory")).isEqualTo(85_920);
        assertThat(count("bus_services")).isEqualTo(10);
        assertThat(count("bus_trips")).isEqualTo(140);
        assertThat(count("hotels")).isEqualTo(26);
        assertThat(count("hotel_policies")).isEqualTo(26);
        assertThat(count("hotel_rooms")).isBetween(260, 520);
        assertThat(count("room_availability")).isEqualTo(count("hotel_rooms") * 14);
        assertThat(count("settings")).isEqualTo(6);
    }

    @Test
    void demoCorridorsAndOccupancyMeetTheAcceptanceCriteria() {
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM trains WHERE source_code = 'PUNE' AND destination_code = 'CSMT'",
                Integer.class)).isGreaterThanOrEqualTo(5);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM trains WHERE source_code = 'CSMT' AND destination_code = 'PUNE'",
                Integer.class)).isGreaterThanOrEqualTo(5);

        Integer nearlyFull = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM (
                    SELECT train_number
                    FROM seat_inventory
                    WHERE travel_date = CURRENT_DATE
                    GROUP BY train_number
                    HAVING SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) >= 0.9
                ) full_trains
                """, Integer.class);
        assertThat(nearlyFull).isGreaterThanOrEqualTo(2);

        Integer feeTypes = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT late_checkout_fee_type) FROM hotel_policies", Integer.class);
        assertThat(feeTypes).isGreaterThanOrEqualTo(3);
        Integer cutoffs = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT late_arrival_cutoff) FROM hotel_policies", Integer.class);
        assertThat(cutoffs).isGreaterThanOrEqualTo(3);
    }

    @Test
    void rerunningTheDemoScriptsDoesNotCreateDuplicates() throws Exception {
        Map<String, Integer> before = counts();

        runScriptsAgain();

        assertThat(counts()).isEqualTo(before);
    }

    @Test
    void stationsRejectDuplicateCodes() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                        INSERT INTO stations (code, name, city, state, latitude, longitude)
                        VALUES ('PUNE', 'Duplicate Pune', 'Pune', 'Maharashtra', 18.5, 73.8)
                        """))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void seederIsIdempotentWhenInvokedAgain() {
        Map<String, Integer> before = counts();

        demoCatalogSeeder.run(null);

        assertThat(counts()).isEqualTo(before);
    }

    private Map<String, Integer> counts() {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String table : COUNTED_TABLES) {
            counts.put(table, count(table));
        }
        return counts;
    }

    private int count(String table) {
        return Objects.requireNonNull(
                jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class));
    }

    private void runScriptsAgain() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection,
                    new EncodedResource(new ClassPathResource("db/demo/V100__demo_catalog.sql"),
                            StandardCharsets.UTF_8));
            ScriptUtils.executeSqlScript(connection,
                    new EncodedResource(new ClassPathResource("db/demo/V101__demo_inventory.sql"),
                            StandardCharsets.UTF_8));
        }
    }
}
