package com.trainconcierge.catalog;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.util.Objects;

/**
 * Loads the catalog demo data when Flyway cannot run, for example on the in-memory H2
 * used for local demos. MySQL deployments load the same SQL through Flyway; this runner
 * detects the existing rows and does nothing.
 */
@Component
@Profile("demo")
@Order(10)
public class DemoCatalogSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoCatalogSeeder.class);

    private static final String SCHEMA_SCRIPT = "db/migration/V3__catalog.sql";
    private static final String CATALOG_SCRIPT = "db/demo/V100__demo_catalog.sql";
    private static final String INVENTORY_SCRIPT = "db/demo/V101__demo_inventory.sql";
    private static final String EXTRA_COACHES_SCRIPT = "db/demo/V102__demo_extra_coaches.sql";

    private final JdbcTemplate jdbcTemplate;
    private final boolean enabled;

    public DemoCatalogSeeder(JdbcTemplate jdbcTemplate,
                             @Value("${app.demo.catalog.enabled:true}") boolean enabled) {
        this.jdbcTemplate = jdbcTemplate;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        boolean needsSchema = !hasCatalogSchema();
        boolean needsCatalog = !hasCatalogData();
        DataSource dataSource = Objects.requireNonNull(jdbcTemplate.getDataSource(),
                "DataSource is required");
        try (Connection connection = dataSource.getConnection()) {
            if (needsSchema) {
                execute(connection, SCHEMA_SCRIPT);
            }
            if (needsCatalog) {
                execute(connection, CATALOG_SCRIPT);
                execute(connection, INVENTORY_SCRIPT);
            }
            // Idempotent additions that must reach databases seeded by an older demo version.
            execute(connection, EXTRA_COACHES_SCRIPT);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not load the demo catalog data", ex);
        }
        log.info(needsCatalog
                ? "Demo catalog data loaded from the db/demo scripts."
                : "Demo catalog demo patches applied.");
    }

    /**
     * {@code hotels} is created by V3 but not mapped as an entity, so its presence proves
     * the full catalog migration has run. Mapped tables such as {@code bus_services} are
     * created by Hibernate in tests and cannot be used as the probe.
     */
    private boolean hasCatalogSchema() {
        try {
            jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hotels", Integer.class);
            return true;
        } catch (DataAccessException ex) {
            return false;
        }
    }

    private boolean hasCatalogData() {
        try {
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM stations", Integer.class);
            return count != null && count > 0;
        } catch (DataAccessException ex) {
            return false;
        }
    }

    private void execute(Connection connection, String path) {
        ScriptUtils.executeSqlScript(connection,
                new EncodedResource(new ClassPathResource(path), StandardCharsets.UTF_8));
    }
}
