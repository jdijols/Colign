package com.colign.config.security;

import java.io.InputStream;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.util.Base64;
import java.util.Collection;
import java.util.List;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Dual-mode JWT validation, switched by {@code wc.auth.mode}:
 *
 * <ul>
 *   <li>{@code real} — validate JWTs against the Auth0 tenant configured by
 *       {@code wc.auth.real.issuer-uri} + {@code jwk-set-uri}. This is the
 *       intended production path.
 *   <li>{@code mock} — validate JWTs against the local RS256 public key at
 *       {@code classpath:keys/colign-mock-public.pem}, paired with the demo
 *       private key in {@code scripts/colign-mock-private.pem}. Mint tokens via
 *       {@code scripts/mock-jwt.mjs}. Demo-only.
 * </ul>
 *
 * Both modes share: 60s clock-skew leeway, audience validation, and the same
 * {@link JwtAuthenticationConverter} (roles read from the namespaced
 * {@code https://colign.org/roles} claim per Auth0 OIDC convention).
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final String ROLES_CLAIM = "https://colign.org/roles";

    /**
     * Comma-separated browser origins allowed to call the API directly. Bound
     * from {@code colign.cors.allowed-origins} (env {@code COLIGN_CORS_ORIGINS}
     * in prod), so the deployed frontend origin doesn't require a code change —
     * the previous hardcoded localhost list was a prod blocker.
     */
    @org.springframework.beans.factory.annotation.Value("${colign.cors.allowed-origins}")
    private String allowedOriginsCsv;

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtDecoder jwtDecoder) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                        "/actuator/health/**", "/actuator/info",
                        "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html"
                ).permitAll()
                // Invitation preview is reachable to the unauthenticated
                // invitee landing on /invite/<token>. The token is the
                // security capability; the response leaks only public-safe
                // fields (team name, inviter display name, relationship).
                // Accept (POST .../accept) still requires auth.
                .requestMatchers(org.springframework.http.HttpMethod.GET,
                        "/api/v1/invitations/*").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .decoder(jwtDecoder)
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())));
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(
            @Value("${colign.auth.mode}") String mode,
            @Value("${colign.auth.audience}") String audience,
            @Value("${colign.auth.real.issuer-uri:#{null}}") String issuerUri,
            @Value("${colign.auth.real.jwk-set-uri:#{null}}") String jwkSetUri,
            org.springframework.core.env.Environment env,
            ResourceLoader resourceLoader) throws Exception {

        String normalized = mode == null ? "" : mode.toLowerCase();

        // application.yml defaults colign.auth.mode to "mock" when the env var
        // is unset, so a prod deploy that forgets COLIGN_AUTH_MODE=real would
        // silently accept any JWT signed by scripts/colign-mock-private.pem.
        // Throwing here fails Spring's context refresh — the app refuses to
        // start at all, instead of starting in a vulnerable state.
        if ("mock".equals(normalized) && isProdLikeProfile(env)) {
            throw new IllegalStateException(
                "REFUSING TO START: colign.auth.mode=mock under active profile(s) "
                    + java.util.Arrays.toString(env.getActiveProfiles())
                    + ". Mock auth accepts any JWT signed by the demo key in "
                    + "scripts/colign-mock-private.pem. Set COLIGN_AUTH_MODE=real "
                    + "(with COLIGN_AUTH0_ISSUER + COLIGN_AUTH0_JWKS) before booting "
                    + "this profile.");
        }

        return switch (normalized) {
            case "real" -> buildRealDecoder(issuerUri, audience);
            case "mock" -> buildMockDecoder(resourceLoader, audience);
            default -> throw new IllegalStateException(
                    "colign.auth.mode must be 'real' or 'mock' (got: " + mode + ")");
        };
    }

    private static boolean isProdLikeProfile(org.springframework.core.env.Environment env) {
        for (String p : env.getActiveProfiles()) {
            String t = p.toLowerCase();
            if (t.equals("prod") || t.equals("production")
                    || t.equals("staging") || t.equals("stage")) {
                return true;
            }
        }
        return false;
    }

    private NimbusJwtDecoder buildRealDecoder(String issuerUri, String audience) {
        if (issuerUri == null || issuerUri.isBlank()) {
            throw new IllegalStateException(
                    "wc.auth.mode=real but wc.auth.real.issuer-uri is empty");
        }
        NimbusJwtDecoder decoder = (NimbusJwtDecoder) JwtDecoders.fromIssuerLocation(issuerUri);
        decoder.setJwtValidator(commonValidator(issuerUri, audience));
        return decoder;
    }

    private NimbusJwtDecoder buildMockDecoder(ResourceLoader rl, String audience) throws Exception {
        Resource pem = rl.getResource("classpath:keys/colign-mock-public.pem");
        RSAPublicKey publicKey;
        try (InputStream in = pem.getInputStream()) {
            String pemText = new String(in.readAllBytes())
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] der = Base64.getDecoder().decode(pemText);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            publicKey = (RSAPublicKey) kf.generatePublic(new X509EncodedKeySpec(der));
        }
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();
        decoder.setJwtValidator(commonValidator(null, audience));
        return decoder;
    }

    private OAuth2TokenValidator<Jwt> commonValidator(String issuerUri, String audience) {
        OAuth2TokenValidator<Jwt> withIssuer = issuerUri == null
                ? JwtValidators.createDefault()
                : JwtValidators.createDefaultWithIssuer(issuerUri);
        OAuth2TokenValidator<Jwt> withAudience = new JwtClaimValidator<List<String>>(
                "aud", aud -> aud != null && aud.contains(audience));
        OAuth2TokenValidator<Jwt> withTimestamp =
                new JwtTimestampValidator(Duration.ofSeconds(60));
        return new DelegatingOAuth2TokenValidator<>(withIssuer, withAudience, withTimestamp);
    }

    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
        scopes.setAuthorityPrefix("SCOPE_");
        scopes.setAuthoritiesClaimName("scope");

        Converter<Jwt, Collection<GrantedAuthority>> rolesAndScopes = jwt -> {
            List<String> roles = jwt.getClaimAsStringList(ROLES_CLAIM);
            Stream<GrantedAuthority> roleAuths = roles == null ? Stream.empty()
                    : roles.stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r));
            Collection<GrantedAuthority> scopeAuths = scopes.convert(jwt);
            return Stream.concat(
                    scopeAuths == null ? Stream.empty() : scopeAuths.stream(),
                    roleAuths
            ).toList();
        };

        JwtAuthenticationConverter conv = new JwtAuthenticationConverter();
        conv.setJwtGrantedAuthoritiesConverter(rolesAndScopes);
        return conv;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(
                java.util.Arrays.stream(allowedOriginsCsv.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        c.setExposedHeaders(List.of("Location", "Link"));
        c.setAllowCredentials(true);
        c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", c);
        return src;
    }
}
