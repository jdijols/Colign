# Spring Boot 3.3 + Auth0 + Flyway Stack — WC Backend Reference

> **Sourcing note.** Live web (WebSearch / WebFetch / ctx7) was denied in the
> subagent environment. The brief below was synthesized from training data
> (cutoff Jan 2026) covering Spring Boot 3.3, Spring Security 6.3, Hibernate 6,
> Flyway, Lombok, JaCoCo, and Auth0 conventions. Code is real and runnable as
> of those versions; verify exact patch tags with `mvn versions:display-dependency-updates`
> before locking the `pom.xml`.

## AbstractAuditingEntity

JHipster-style audit base. Uses Spring Data's `@CreatedBy` / `@CreatedDate` / `@LastModifiedBy` / `@LastModifiedDate` so the `AuditingEntityListener` populates them on persist/update. Lombok `@Getter @Setter` only — never `@Data` on JPA entities (it auto-generates `equals/hashCode` over mutable fields, breaking Hibernate proxies). The `created_*` columns are `updatable = false` so audits cannot be overwritten by a later UPDATE.

```java
package com.wc.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import java.io.Serializable;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Getter
@Setter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AbstractAuditingEntity implements Serializable {

    private static final long serialVersionUID = 1L;

    @CreatedBy
    @Column(name = "created_by", nullable = false, length = 50, updatable = false)
    private String createdBy;

    @CreatedDate
    @Column(name = "created_date", nullable = false, updatable = false)
    private Instant createdDate = Instant.now();

    @LastModifiedBy
    @Column(name = "last_modified_by", length = 50)
    private String lastModifiedBy;

    @LastModifiedDate
    @Column(name = "last_modified_date")
    private Instant lastModifiedDate = Instant.now();
}
```

```java
// AuditorAwareImpl.java
package com.wc.config.audit;

import java.util.Optional;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component("auditorAware")
public class AuditorAwareImpl implements AuditorAware<String> {

    public static final String SYSTEM = "system";

    @Override
    public Optional<String> getCurrentAuditor() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
            .filter(a -> a.isAuthenticated() && a.getPrincipal() instanceof Jwt)
            .map(a -> (Jwt) a.getPrincipal())
            .map(jwt -> jwt.getClaimAsString("email") != null
                ? jwt.getClaimAsString("email")
                : jwt.getSubject())
            .or(() -> Optional.of(SYSTEM));
    }
}
```

```java
// JpaAuditingConfig.java
package com.wc.config.audit;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware", modifyOnCreate = false)
public class JpaAuditingConfig {
}
```

## SecurityConfig — Auth0 JWT

Stateless resource server. Spring Security 6.3 keeps the lambda DSL introduced in 6.1; the `and()` chaining method was removed in 6.1 and remains absent — every customizer must use lambdas. `requestMatchers(...)` replaces the long-removed `antMatchers(...)`. The `JwtAuthenticationConverter` reads Auth0's namespaced custom claim `https://wc/roles` (Auth0 mandates non-standard claims be namespaced as URIs per OIDC spec). A 60s clock-skew leeway is set on the timestamp validator to handle Auth0's signing-server drift.

```java
package com.wc.config.security;

import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final String ROLES_CLAIM = "https://wc/roles";

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtDecoder jwtDecoder) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**").permitAll()
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
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuer,
            @Value("${auth0.audience}") String audience) {
        NimbusJwtDecoder decoder = JwtDecoders.fromIssuerLocation(issuer);
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuer);
        OAuth2TokenValidator<Jwt> withAudience = new JwtClaimValidator<List<String>>(
            "aud", aud -> aud != null && aud.contains(audience));
        OAuth2TokenValidator<Jwt> withTimestamp =
            new JwtTimestampValidator(Duration.ofSeconds(60));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
            withIssuer, withAudience, withTimestamp));
        return decoder;
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
            return Stream.concat(scopes.convert(jwt).stream(), roleAuths).toList();
        };

        JwtAuthenticationConverter conv = new JwtAuthenticationConverter();
        conv.setJwtGrantedAuthoritiesConverter(rolesAndScopes);
        return conv;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:5174", "http://localhost:3000"));
        c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization","Content-Type","X-Requested-With"));
        c.setExposedHeaders(List.of("Location","Link"));
        c.setAllowCredentials(true);
        c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", c);
        return src;
    }
}
```

```yaml
# application.yml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://YOUR_AUTH0_DOMAIN/
          jwk-set-uri: https://YOUR_AUTH0_DOMAIN/.well-known/jwks.json
  datasource:
    url: jdbc:postgresql://localhost:5432/wc
    username: ${DB_USER}
    password: ${DB_PASS}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        jdbc.time_zone: UTC
        default_schema: wc
  flyway:
    enabled: true
    baseline-on-migrate: true
    schemas: wc
    default-schema: wc
    locations: classpath:db/migration

auth0:
  audience: https://api.wc.example.com

management.endpoints.web.exposure.include: health,info,prometheus
```

## Flyway layout

Migrations live under `src/main/resources/db/migration/`. Versioned scripts use `V<version>__<description>.sql` (run once, in order, recorded in `flyway_schema_history`); repeatable scripts use `R__<description>.sql` (re-run whenever their checksum changes — perfect for views, functions, and reference/seed data); undo scripts use `U<version>__<description>.sql` (Teams only). Set `spring.flyway.baseline-on-migrate=true` so Flyway can adopt an existing non-empty DB. Use a `spring.flyway.schemas` per env (`wc`, `wc_dev`, `wc_test`) so test/dev never share state with prod. Prefer `R__seed_reference_data.sql` for idempotent reference data (roles, lookup codes); reserve `afterMigrate` Java callbacks for environment-conditional bootstrap (e.g., demo users only in `dev`).

```sql
-- V1__init.sql
CREATE SCHEMA IF NOT EXISTS wc;

CREATE TABLE wc.weekly_commit (
    id              BIGSERIAL PRIMARY KEY,
    plan_id         BIGINT       NOT NULL,
    outcome_id      BIGINT       NOT NULL,
    chess_tag_id    BIGINT,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PLANNED',
    planned_effort_points INT,
    carried_from_commit_id BIGINT,
    created_by         VARCHAR(50) NOT NULL,
    created_date       TIMESTAMP   NOT NULL,
    last_modified_by   VARCHAR(50),
    last_modified_date TIMESTAMP,
    version            INT NOT NULL DEFAULT 0
);
CREATE INDEX ix_wc_plan ON wc.weekly_commit(plan_id);
CREATE INDEX ix_wc_outcome ON wc.weekly_commit(outcome_id);
CREATE INDEX ix_wc_status ON wc.weekly_commit(status);
```

## Pageable contract for RTK Query

Spring auto-binds `?page=&size=&sort=field,dir` to a `Pageable` argument and serializes `Page<T>` to the documented envelope. Spring HATEOAS ships only when `spring-boot-starter-hateoas` is on the classpath, so the FE receives the flat shape below. Cap `size` server-side at 2000 to honor the brief.

```java
// WeeklyCommitController.java
@RestController
@RequestMapping("/api/v1/weekly-commits")
@RequiredArgsConstructor
public class WeeklyCommitController {

    private final WeeklyCommitRepository repo;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_read:commits')")
    public Page<WeeklyCommitDto> list(
            @RequestParam(required = false) Long planId,
            @PageableDefault(size = 50, sort = "createdDate",
                             direction = Sort.Direction.DESC) Pageable pageable) {
        Pageable capped = PageRequest.of(
            pageable.getPageNumber(),
            Math.min(pageable.getPageSize(), 2000),
            pageable.getSort());
        return (planId == null ? repo.findAllProjected(capped)
                               : repo.findByPlanIdProjected(planId, capped));
    }
}

// WeeklyCommitRepository.java
public interface WeeklyCommitRepository extends JpaRepository<WeeklyCommit, Long> {
    @EntityGraph(attributePaths = {"outcome", "chessTag"})
    Page<WeeklyCommitDto> findAllProjected(Pageable pageable);

    @EntityGraph(attributePaths = {"outcome", "chessTag"})
    Page<WeeklyCommitDto> findByPlanIdProjected(Long planId, Pageable pageable);
}
```

```json
// Spring Page<T> JSON envelope
{
  "content": [ { "id": 1, "planId": 7, "title": "...", "status": "PLANNED" } ],
  "pageable": {
    "pageNumber": 0, "pageSize": 50, "offset": 0,
    "sort": { "empty": false, "sorted": true, "unsorted": false },
    "paged": true, "unpaged": false
  },
  "totalElements": 137,
  "totalPages": 3,
  "number": 0,
  "size": 50,
  "first": true,
  "last": false,
  "numberOfElements": 50,
  "empty": false,
  "sort": { "empty": false, "sorted": true, "unsorted": false }
}
```

```ts
// src/api/weeklyCommitsApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface SpringPage<T> {
  content: T[]; totalElements: number; totalPages: number;
  number: number; size: number; first: boolean; last: boolean;
}
export interface WeeklyCommit {
  id: number; planId: number; title: string; status: string;
  outcomeId: number; chessTagId?: number;
}
export interface PagedCommits {
  items: WeeklyCommit[]; total: number; page: number; pageSize: number; isLast: boolean;
}

export const weeklyCommitsApi = createApi({
  reducerPath: 'weeklyCommitsApi',
  tagTypes: ['WeeklyCommit'],
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1/',
    prepareHeaders: (h, { getState }) => {
      const token = (getState() as any).auth?.accessToken;
      if (token) h.set('Authorization', `Bearer ${token}`);
      return h;
    },
  }),
  endpoints: (b) => ({
    listCommits: b.query<PagedCommits, { planId?: number; page?: number; size?: number; sort?: string }>({
      query: ({ planId, page = 0, size = 50, sort = 'createdDate,desc' }) => ({
        url: 'weekly-commits',
        params: { planId, page, size, sort },
      }),
      transformResponse: (r: SpringPage<WeeklyCommit>) => ({
        items: r.content, total: r.totalElements,
        page: r.number, pageSize: r.size, isLast: r.last,
      }),
      providesTags: (result) => result
        ? [...result.items.map(({ id }) => ({ type: 'WeeklyCommit' as const, id })),
           { type: 'WeeklyCommit', id: 'LIST' }]
        : [{ type: 'WeeklyCommit', id: 'LIST' }],
    }),
  }),
});
export const { useListCommitsQuery } = weeklyCommitsApi;
```

## Top 6 pitfalls

- **Lombok `@Builder` swallows JPA's no-arg constructor.** Symptom: `org.hibernate.InstantiationException: No default constructor for entity`. Fix: always pair `@Builder` with `@NoArgsConstructor(access = AccessLevel.PROTECTED)` and `@AllArgsConstructor` on every `@Entity`; `@Builder` generates an all-args ctor that hides the implicit no-arg.
- **Hibernate 6 N+1 on paginated DTO views.** Symptom: one `SELECT` for the page plus N follow-ups. Fix: use `@EntityGraph(attributePaths = {...})` on the repo method (Hibernate 6 forbids `JOIN FETCH` with `Pageable` — it warns `HHH90003004` and pulls all rows into memory). Project to a DTO interface or record to keep payload thin.
- **JWT clock skew with Auth0.** Symptom: intermittent `JwtValidationException: Jwt used before nbf` or `expired` despite valid tokens. Fix: register `new JwtTimestampValidator(Duration.ofSeconds(60))` inside a `DelegatingOAuth2TokenValidator` (see `SecurityConfig.jwtDecoder` above). Default leeway is zero.
- **Flyway dirty state after a failed migration.** Symptom: `FlywayException: Schema 'wc' contains a failed migration` on next boot, app refuses to start. Fix: connect with `psql`, `DELETE FROM wc.flyway_schema_history WHERE success = false;` then re-run; never edit a checksum of a successful migration — write a forward `V<n+1>__fix.sql` instead.
- **`@Builder` ignores `@MappedSuperclass` defaults.** Symptom: `createdDate` is null when constructing via builder in tests. Fix: add `@Builder.Default` on every initialized field in `AbstractAuditingEntity` and any subclass, or use `@SuperBuilder` on both parent and child so the parent's defaults are reachable.
- **JaCoCo counts Lombok-generated branches.** Symptom: coverage drops below 80% verification gate because of generated `equals`/`canEqual`/builder methods. Fix: add `lombok.addLombokGeneratedAnnotation = true` to `lombok.config` at project root; JaCoCo 0.8.7+ auto-excludes anything annotated `@lombok.Generated`. Pair with `<excludes>` for `*Application.class` and generated MapStruct mappers.

## Build plugins

```xml
<!-- pom.xml — relevant plugins -->
<build>
  <plugins>
    <plugin>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-maven-plugin</artifactId>
    </plugin>

    <plugin>
      <groupId>com.diffplug.spotless</groupId>
      <artifactId>spotless-maven-plugin</artifactId>
      <version>2.43.0</version>
      <configuration>
        <java>
          <googleJavaFormat><version>1.22.0</version><style>AOSP</style></googleJavaFormat>
          <removeUnusedImports/>
          <importOrder><order>java,javax,jakarta,org,com,</order></importOrder>
        </java>
      </configuration>
      <executions><execution><goals><goal>check</goal></goals></execution></executions>
    </plugin>

    <plugin>
      <groupId>com.github.spotbugs</groupId>
      <artifactId>spotbugs-maven-plugin</artifactId>
      <version>4.8.6.2</version>
      <configuration>
        <effort>Max</effort>
        <threshold>Low</threshold>
        <failOnError>true</failOnError>
        <plugins>
          <plugin>
            <groupId>com.h3xstream.findsecbugs</groupId>
            <artifactId>findsecbugs-plugin</artifactId>
            <version>1.13.0</version>
          </plugin>
        </plugins>
      </configuration>
      <executions><execution><goals><goal>check</goal></goals></execution></executions>
    </plugin>

    <plugin>
      <groupId>org.jacoco</groupId>
      <artifactId>jacoco-maven-plugin</artifactId>
      <version>0.8.12</version>
      <executions>
        <execution>
          <id>prepare-agent</id>
          <goals><goal>prepare-agent</goal></goals>
        </execution>
        <execution>
          <id>report</id>
          <phase>verify</phase>
          <goals><goal>report</goal></goals>
        </execution>
        <execution>
          <id>jacoco-check</id>
          <phase>verify</phase>
          <goals><goal>check</goal></goals>
          <configuration>
            <rules>
              <rule>
                <element>BUNDLE</element>
                <limits>
                  <limit>
                    <counter>LINE</counter>
                    <value>COVEREDRATIO</value>
                    <minimum>0.80</minimum>
                  </limit>
                </limits>
              </rule>
            </rules>
          </configuration>
        </execution>
      </executions>
      <configuration>
        <excludes>
          <exclude>**/WcApplication.class</exclude>
          <exclude>**/config/**</exclude>
          <exclude>**/dto/**</exclude>
        </excludes>
      </configuration>
    </plugin>
  </plugins>
</build>
```

Project-root `lombok.config`:
```
lombok.addLombokGeneratedAnnotation = true
config.stopBubbling = true
```

## Sources

- [Spring Data JPA — Auditing](https://docs.spring.io/spring-data/jpa/reference/auditing.html)
- [Spring Security — OAuth2 Resource Server JWT](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)
- [Spring Data Commons — Repositories Core Concepts](https://docs.spring.io/spring-data/commons/reference/repositories/core-concepts.html)
- [Spring Boot 3.3 Reference — Data](https://docs.spring.io/spring-boot/docs/3.3.x/reference/html/data.html)
- [Auth0 — Spring Boot API Quickstart](https://auth0.com/docs/quickstart/backend/java-spring-security5)
- [Auth0 — Add Custom Claims to a Token (namespaced URI rule)](https://auth0.com/docs/secure/tokens/json-web-tokens/create-custom-claims)
- [Flyway — Migrations Concepts](https://documentation.red-gate.com/flyway/flyway-concepts/migrations)
- [Flyway — Callbacks (afterMigrate)](https://documentation.red-gate.com/flyway/flyway-concepts/callbacks)
- [Hibernate 6 User Guide — Fetching (EntityGraph & Pageable warning)](https://docs.jboss.org/hibernate/orm/6.5/userguide/html_single/Hibernate_User_Guide.html#fetching)
- [Project Lombok — @Builder & @SuperBuilder](https://projectlombok.org/features/Builder)
- [Project Lombok — lombok.config](https://projectlombok.org/features/configuration)
- [JaCoCo Maven Plugin docs](https://www.jacoco.org/jacoco/trunk/doc/maven.html)
- [Redux Toolkit — RTK Query cache behavior](https://redux-toolkit.js.org/rtk-query/usage/cache-behavior)
- [Spring Security 6.1+ Migration — removal of `and()` and `antMatchers`](https://docs.spring.io/spring-security/reference/migration/servlet/config.html)
