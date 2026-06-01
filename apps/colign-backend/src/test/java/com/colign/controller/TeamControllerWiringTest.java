package com.colign.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import com.colign.service.email.EmailClient;
import com.fasterxml.jackson.databind.ObjectMapper;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class TeamControllerWiringTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired TeamRepository teams;
    @MockBean EmailClient emailClient;

    private Team team;
    private User lead;

    @BeforeEach
    void seed() {
        // Reuse-or-create so multiple @Tests in this class don't trip UNIQUE
        // constraints on the shared per-class H2 context (DirtiesContext AFTER_CLASS).
        lead = users.findByEmail("lead-tcw@example.com").orElseGet(() -> users.save(
                User.builder().email("lead-tcw@example.com").displayName("Lead")
                        .role(UserRole.IC).auth0Sub("auth0|lead-tcw").active(true).build()));
        team = (lead.getTeamId() != null
                ? teams.findById(lead.getTeamId()).orElse(null) : null);
        if (team == null) {
            team = teams.save(Team.builder().name("TCW Team").leadUserId(lead.getId()).build());
            lead.setTeamId(team.getId());
            users.save(lead);
        } else if (!"TCW Team".equals(team.getName())) {
            // Reset name in case patchTeam_renames ran before this test.
            team.setName("TCW Team");
            team = teams.save(team);
        }
    }

    @Test
    void listMembers_returns200_forLead() throws Exception {
        mvc.perform(get("/api/v1/teams/" + team.getId() + "/members").with(jwtFor(lead)))
                .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(200))
                .andExpect(r -> assertThat(r.getResponse().getContentAsString())
                        .contains("\"email\":\"lead-tcw@example.com\""));
    }

    @Test
    void listMembers_returns401_withoutAuth() throws Exception {
        mvc.perform(get("/api/v1/teams/" + team.getId() + "/members"))
                .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(401));
    }

    @Test
    void patchTeam_renames() throws Exception {
        String body = json.writeValueAsString(new java.util.LinkedHashMap<>() {{
            put("name", "Renamed Team");
        }});
        mvc.perform(patch("/api/v1/teams/" + team.getId())
                        .with(jwtFor(lead))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(r -> {
                    assertThat(r.getResponse().getStatus()).isEqualTo(200);
                    assertThat(r.getResponse().getContentAsString())
                            .contains("\"name\":\"Renamed Team\"");
                });
        assertThat(teams.findById(team.getId()).orElseThrow().getName()).isEqualTo("Renamed Team");
    }

    @Test
    void patchTeam_rejectsBlankName() throws Exception {
        mvc.perform(patch("/api/v1/teams/" + team.getId())
                        .with(jwtFor(lead))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"   \"}"))
                .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(400));
    }

    @Test
    void getTeam_returns200_forMember() throws Exception {
        mvc.perform(get("/api/v1/teams/" + team.getId()).with(jwtFor(lead)))
                .andExpect(r -> {
                    assertThat(r.getResponse().getStatus()).isEqualTo(200);
                    assertThat(r.getResponse().getContentAsString()).contains("\"name\":\"TCW Team\"");
                });
    }

    private static RequestPostProcessor jwtFor(User user) {
        return jwt().jwt(jwt -> jwt
                .subject(user.getAuth0Sub())
                .claim("email", user.getEmail())
                .audience(java.util.List.of("https://api.colign.org")));
    }
}
