package com.colign.config.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.mock.env.MockEnvironment;

/**
 * Unit tests for the prod-mock-mode startup guard added to
 * {@link SecurityConfig#jwtDecoder}. Calls the bean factory method directly
 * with a controlled {@link MockEnvironment} so the assertion is about the
 * guard predicate alone — no Spring context boot, no DB, no Flyway.
 *
 * <p>The guard's contract:
 * <ul>
 *   <li>Active profile in {@code prod / production / staging / stage} AND
 *       {@code colign.auth.mode=mock} → throw {@link IllegalStateException}
 *       with a {@code REFUSING TO START} prefix.</li>
 *   <li>Any other combination (local / test profile, or real mode) → guard
 *       does not fire; the existing switch branches handle the request.</li>
 * </ul>
 */
class SecurityConfigStartupGuardTest {

    private final SecurityConfig config = new SecurityConfig();
    private final DefaultResourceLoader loader = new DefaultResourceLoader();

    @Test
    void prodProfileWithMockModeRefusesToStart() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        assertThatThrownBy(() ->
            config.jwtDecoder("mock", "https://api.colign.org", null, null, env, loader))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("REFUSING TO START")
            .hasMessageContaining("colign.auth.mode=mock")
            .hasMessageContaining("COLIGN_AUTH_MODE=real");
    }

    @Test
    void stagingProfileWithMockModeRefusesToStart() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("staging");

        assertThatThrownBy(() ->
            config.jwtDecoder("mock", "https://api.colign.org", null, null, env, loader))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("REFUSING TO START");
    }

    @Test
    void productionSpellingVariantAlsoRefuses() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");

        assertThatThrownBy(() ->
            config.jwtDecoder("mock", "https://api.colign.org", null, null, env, loader))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("REFUSING TO START");
    }

    @Test
    void stageSpellingVariantAlsoRefuses() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("stage");

        assertThatThrownBy(() ->
            config.jwtDecoder("mock", "https://api.colign.org", null, null, env, loader))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("REFUSING TO START");
    }

    @Test
    void uppercaseMockUnderProdStillCaught() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        assertThatThrownBy(() ->
            config.jwtDecoder("MOCK", "https://api.colign.org", null, null, env, loader))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("REFUSING TO START");
    }

    @Test
    void mixedProfilesWithProdStillCaught() {
        // Spring profile resolution merges SPRING_PROFILES_ACTIVE +
        // spring.profiles.include into a single list. The guard must
        // fire if ANY active profile is prod-like, not only when prod
        // is the sole profile.
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("local", "prod");

        assertThatThrownBy(() ->
            config.jwtDecoder("mock", "https://api.colign.org", null, null, env, loader))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("REFUSING TO START");
    }

    @Test
    void localProfileWithMockModeStartsFine() throws Exception {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("local");

        // Loads the demo public key from src/main/resources — present on the
        // test classpath. Building the decoder must succeed.
        assertThat(config.jwtDecoder("mock", "https://api.colign.org", null, null, env, loader))
            .isNotNull();
    }

    @Test
    void testProfileWithMockModeStartsFine() throws Exception {
        // Existing application-test.yml uses mock auth under the test profile.
        // The guard's prod-like list must NOT catch "test", or the existing
        // SpringBootTest suites would all fail to bootstrap.
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("test");

        assertThat(config.jwtDecoder("mock", "https://api.colign.org", null, null, env, loader))
            .isNotNull();
    }

    @Test
    void realModeUnderProdProfileIsNotBlockedByGuard() {
        // Sanity check: the guard fires only on mock+prod. Real mode under
        // prod must reach buildRealDecoder. Without a real Auth0 issuer
        // configured, buildRealDecoder fails — but with a DIFFERENT message,
        // confirming the guard did not intercept.
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        assertThatThrownBy(() ->
            config.jwtDecoder("real", "https://api.colign.org", null, null, env, loader))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("issuer-uri is empty");
    }

    @Test
    void emptyActiveProfilesWithMockModeStartsFine() throws Exception {
        // Default state when SPRING_PROFILES_ACTIVE is unset and no default
        // is configured. Spring falls back to its default profile; guard
        // must NOT fire because no prod-like profile is active.
        MockEnvironment env = new MockEnvironment();
        // No setActiveProfiles call — env.getActiveProfiles() returns empty.

        assertThat(config.jwtDecoder("mock", "https://api.colign.org", null, null, env, loader))
            .isNotNull();
    }
}
