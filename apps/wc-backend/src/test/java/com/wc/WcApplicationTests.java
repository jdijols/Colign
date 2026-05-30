package com.wc;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Smoke test: does the Spring context load with the current entity + audit + security wiring?
 * Real integration tests against Testcontainers Postgres land in Slot 3+.
 */
@SpringBootTest
@ActiveProfiles("test")
class WcApplicationTests {

    @Test
    void contextLoads() {
        // Intentional empty body: failure surfaces as a context-load exception.
    }
}
