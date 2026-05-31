package com.colign.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.colign.domain.Invitation;
import com.colign.domain.InvitationRelationship;
import com.colign.domain.InvitationStatus;
import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import com.colign.repository.InvitationRepository;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import com.colign.service.email.EmailClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * End-to-end wiring smoke for the invitation endpoints. Boots the real Spring
 * context (H2 + mock JWT decoder per the test profile) and exercises HTTP +
 * security + DB so that issues SecurityConfig path matching, controller
 * registration, or JSON shape don't slip past the service-layer unit tests
 * in {@link com.colign.service.InvitationServiceTest}.
 *
 * The email client is mocked so a missing Resend key in CI doesn't matter.
 * {@code @DirtiesContext} keeps the per-test H2 instance from leaking rows
 * between this test and any other {@code @SpringBootTest} in the suite.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class InvitationControllerWiringTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired TeamRepository teams;
    @Autowired InvitationRepository invitations;

    @MockBean EmailClient emailClient;

    private Team team;
    private User inviter;

    @BeforeEach
    void seed() {
        invitations.deleteAll();

        // Reuse-or-create across tests so the shared H2 context (kept by
        // @DirtiesContext AFTER_CLASS) doesn't trip the email/auth0Sub UNIQUE
        // constraints on the second @Test in this class.
        inviter = users.findByEmail("lead-wiring@example.com").orElseGet(() -> {
            User u = User.builder()
                    .email("lead-wiring@example.com")
                    .displayName("Lead Person")
                    .role(UserRole.IC)
                    .auth0Sub("auth0|lead-wiring")
                    .active(true)
                    .build();
            return users.save(u);
        });

        team = (inviter.getTeamId() != null
                ? teams.findById(inviter.getTeamId()).orElse(null)
                : null);
        if (team == null) {
            team = teams.save(Team.builder()
                    .name("Wiring Test Team")
                    .leadUserId(inviter.getId())
                    .build());
            inviter.setTeamId(team.getId());
            users.save(inviter);
        }
    }

    @Test
    void previewEndpointIsReachableWithoutAuthentication() throws Exception {
        // Pre-seed an invitation directly so we don't depend on the create
        // endpoint or email client for this test.
        Invitation invite = Invitation.builder()
                .email("invitee@example.com")
                .teamId(team.getId())
                .inviterUserId(inviter.getId())
                .relationship(InvitationRelationship.REPORT)
                .token("preview-wiring-tok")
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .status(InvitationStatus.PENDING)
                .build();
        invitations.save(invite);

        mvc.perform(get("/api/v1/invitations/preview-wiring-tok"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isEqualTo(200);
                    String body = result.getResponse().getContentAsString();
                    assertThat(body).contains("\"teamName\":\"Wiring Test Team\"");
                    assertThat(body).contains("\"relationship\":\"REPORT\"");
                    assertThat(body).contains("\"status\":\"PENDING\"");
                });
    }

    @Test
    void acceptEndpointRequiresAuthentication() throws Exception {
        mvc.perform(post("/api/v1/invitations/anything/accept"))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isEqualTo(401));
    }

    @Test
    void createInvitation_persistsAndReturnsAcceptUrl() throws Exception {
        String body = json.writeValueAsString(new java.util.LinkedHashMap<>() {{
            put("email", "new-hire@example.com");
            put("relationship", "REPORT");
        }});

        mvc.perform(post("/api/v1/teams/" + team.getId() + "/invitations")
                        .with(jwtFor(inviter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(result -> {
                    assertThat(result.getResponse().getStatus()).isEqualTo(201);
                    String resp = result.getResponse().getContentAsString();
                    assertThat(resp).contains("\"email\":\"new-hire@example.com\"");
                    assertThat(resp).contains("\"relationship\":\"REPORT\"");
                    assertThat(resp).contains("\"acceptUrl\":\"http://localhost:4173/weekly-commit/invite/");
                });

        assertThat(invitations.findAll())
                .anyMatch(i -> i.getEmail().equals("new-hire@example.com"));
    }

    /**
     * Build a JWT request-post-processor that matches the row {@link #seed()}
     * persisted, so {@code UserResolver.resolveCurrent()} returns it rather
     * than provisioning a new one.
     */
    private static org.springframework.test.web.servlet.request.RequestPostProcessor jwtFor(User user) {
        return jwt().jwt(jwt -> jwt
                .subject(user.getAuth0Sub())
                .claim("email", user.getEmail())
                .claim("aud", java.util.List.of("https://api.colign.org"))
                .audience(java.util.List.of("https://api.colign.org")));
    }

}
