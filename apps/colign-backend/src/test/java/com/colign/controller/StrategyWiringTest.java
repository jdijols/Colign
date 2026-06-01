package com.colign.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.colign.domain.Plan;
import com.colign.domain.PlanState;
import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import com.colign.repository.PlanRepository;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import com.colign.service.email.EmailClient;
import java.time.LocalDate;
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
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * End-to-end wiring for the strategy slice: RCDO authoring authz, the {@code strategySetupComplete}
 * signal on /me, and the server-side 422 gate on weekly-commit creation.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class StrategyWiringTest {

  @Autowired MockMvc mvc;
  @Autowired UserRepository users;
  @Autowired TeamRepository teams;
  @Autowired PlanRepository plans;
  @MockBean EmailClient emailClient;

  private Team team;
  private User lead;
  private User ic;

  @BeforeEach
  void seed() {
    lead =
        users
            .findByEmail("lead-sw@example.com")
            .orElseGet(
                () ->
                    users.save(
                        User.builder()
                            .email("lead-sw@example.com")
                            .displayName("Lead SW")
                            .role(UserRole.IC)
                            .auth0Sub("auth0|lead-sw")
                            .active(true)
                            .build()));
    team = lead.getTeamId() != null ? teams.findById(lead.getTeamId()).orElse(null) : null;
    if (team == null) {
      team = teams.save(Team.builder().name("SW Team").leadUserId(lead.getId()).build());
      lead.setTeamId(team.getId());
      lead = users.save(lead);
    }
    ic =
        users
            .findByEmail("ic-sw@example.com")
            .orElseGet(
                () ->
                    users.save(
                        User.builder()
                            .email("ic-sw@example.com")
                            .displayName("IC SW")
                            .role(UserRole.IC)
                            .auth0Sub("auth0|ic-sw")
                            .active(true)
                            .build()));
    if (ic.getTeamId() == null) {
      ic.setTeamId(team.getId());
      ic = users.save(ic);
    }
  }

  @Test
  void unauthenticated_post_rallyCry_returns401() throws Exception {
    mvc.perform(
            post("/api/v1/rally-cries")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"X\"}"))
        .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(401));
  }

  @Test
  void plainIc_cannot_create_rallyCry_returns403() throws Exception {
    mvc.perform(
            post("/api/v1/rally-cries")
                .with(jwtFor(ic))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"IC tries strategy\"}"))
        .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(403));
  }

  @Test
  void lead_can_author_full_chain_and_me_flips_complete() throws Exception {
    // Before any strategy, /me reports incomplete for the lead.
    mvc.perform(get("/api/v1/me").with(jwtFor(lead)))
        .andExpect(
            r ->
                assertThat(r.getResponse().getContentAsString())
                    .contains("\"strategySetupComplete\":false"));

    Long rcId =
        idFrom(
            mvc.perform(
                    post("/api/v1/rally-cries")
                        .with(jwtFor(lead))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Win the quarter\"}"))
                .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(201))
                .andReturn()
                .getResponse()
                .getContentAsString());

    Long doId =
        idFrom(
            mvc.perform(
                    post("/api/v1/defining-objectives")
                        .with(jwtFor(lead))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rallyCryId\":" + rcId + ",\"title\":\"Reduce churn\"}"))
                .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(201))
                .andReturn()
                .getResponse()
                .getContentAsString());

    mvc.perform(
            post("/api/v1/outcomes")
                .with(jwtFor(lead))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"definingObjectiveId\":" + doId + ",\"title\":\"Churn < 2%\",\"priorityTier\":\"P0\"}"))
        .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(201));

    // Now strategy is complete for the team.
    mvc.perform(get("/api/v1/me").with(jwtFor(lead)))
        .andExpect(
            r ->
                assertThat(r.getResponse().getContentAsString())
                    .contains("\"strategySetupComplete\":true"));
  }

  @Test
  void commit_add_returns422_whenStrategyIncomplete() throws Exception {
    // Fresh team with no strategy chain → an IC's commit creation is rejected 422,
    // before the outcome FK is even consulted.
    Team bare = teams.save(Team.builder().name("Bare Team").build());
    User loner =
        users.save(
            User.builder()
                .email("loner-sw@example.com")
                .displayName("Loner")
                .role(UserRole.IC)
                .auth0Sub("auth0|loner-sw")
                .active(true)
                .teamId(bare.getId())
                .build());
    Plan plan =
        plans.save(
            Plan.builder()
                .userId(loner.getId())
                .weekStartDate(LocalDate.of(2026, 6, 1))
                .state(PlanState.DRAFT)
                .build());

    mvc.perform(
            post("/api/v1/plans/" + plan.getId() + "/commits")
                .with(jwtFor(loner))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Do work\",\"outcomeId\":1}"))
        .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(422));
  }

  private static Long idFrom(String json) {
    int i = json.indexOf("\"id\":");
    int start = i + 5;
    int end = start;
    while (end < json.length() && (Character.isDigit(json.charAt(end)))) end++;
    return Long.parseLong(json.substring(start, end));
  }

  private static RequestPostProcessor jwtFor(User user) {
    return jwt()
        .jwt(
            jwt ->
                jwt.subject(user.getAuth0Sub())
                    .claim("email", user.getEmail())
                    .audience(java.util.List.of("https://api.colign.org")));
  }
}
