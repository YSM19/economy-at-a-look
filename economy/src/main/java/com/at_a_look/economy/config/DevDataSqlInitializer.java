package com.at_a_look.economy.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Loads the large dev-only exchange rate dataset when the connected schema is "economy".
 */
@Slf4j
@Component
@Profile("dev")
@Order(0)
@RequiredArgsConstructor
public class DevDataSqlInitializer implements ApplicationRunner {

    private final DataSource dataSource;

    @Value("classpath:data-dev.sql")
    private Resource dataScript;

    private static final String TARGET_SCHEMA = "economy-test";

    @Override
    public void run(ApplicationArguments args) {
        if (!dataScript.exists()) {
            log.warn("[DevDataSqlInitializer] Skipping dev data load because data-dev.sql was not found on the classpath.");
            return;
        }

        String currentSchema = resolveCurrentSchema();
        if (currentSchema == null) {
            log.warn("[DevDataSqlInitializer] Could not determine current schema; skipping dev data load.");
            return;
        }

        if (!TARGET_SCHEMA.equalsIgnoreCase(currentSchema)) {
            log.info("[DevDataSqlInitializer] Skipping dev data load because current schema '{}' does not match '{}'.",
                    currentSchema, TARGET_SCHEMA);
            return;
        }

        log.info("[DevDataSqlInitializer] Loading data-dev.sql into schema '{}'. This may take a while...", currentSchema);
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(dataScript);
        try {
            populator.execute(dataSource);
            log.info("[DevDataSqlInitializer] Finished loading dev sample data into schema '{}'.", currentSchema);
        } catch (Exception ex) {
            log.error("[DevDataSqlInitializer] Failed to execute data-dev.sql: {}", ex.getMessage(), ex);
        }
    }

    private String resolveCurrentSchema() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.getCatalog();
        } catch (SQLException ex) {
            log.error("[DevDataSqlInitializer] Failed to inspect current schema: {}", ex.getMessage(), ex);
            return null;
        }
    }
}
