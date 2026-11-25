package com.trainconcierge.catalog;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "app.demo.catalog.enabled=false",
        "app.demo.password=Str0ng#Pass",
        "spring.datasource.url=jdbc:h2:mem:catalog-schema-present;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER"
})
@ActiveProfiles({"test", "demo"})
class DemoCatalogSchemaAwareSeedTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private DataSource dataSource;

    @Test
    void seedsDemoRowsWhenTheMigratedSchemaIsEmpty() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection, new EncodedResource(
                    new ClassPathResource("db/migration/V3__catalog.sql"), StandardCharsets.UTF_8));
        }
        assertThat(count("stations")).isZero();

        new DemoCatalogSeeder(jdbcTemplate, true).run(null);

        assertThat(count("stations")).isEqualTo(29);
        assertThat(count("bus_services")).isEqualTo(10);
    }

    private Integer count(String table) {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
    }
}
