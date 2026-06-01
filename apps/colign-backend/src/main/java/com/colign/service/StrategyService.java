package com.colign.service;

import com.colign.domain.DefiningObjective;
import com.colign.domain.Outcome;
import com.colign.domain.RallyCry;
import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import com.colign.dto.CreateDefiningObjectiveRequest;
import com.colign.dto.CreateOutcomeRequest;
import com.colign.dto.CreateRallyCryRequest;
import com.colign.dto.DefiningObjectiveDto;
import com.colign.dto.OutcomeRefDto;
import com.colign.dto.RallyCryDto;
import com.colign.dto.UpdateDefiningObjectiveRequest;
import com.colign.dto.UpdateOutcomeRequest;
import com.colign.dto.UpdateRallyCryRequest;
import com.colign.repository.DefiningObjectiveRepository;
import com.colign.repository.OutcomeRepository;
import com.colign.repository.RallyCryRepository;
import com.colign.repository.TeamRepository;
import java.time.LocalDate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Team-scoped strategy authoring: create / update / delete the Rally Cry → Defining Objective →
 * Outcome chain, plus the {@code strategySetupComplete} signal that gates weekly planning.
 *
 * <p>Authority follows the plan's V1 rule — {@code requireSameTeam(caller, target.teamId) && role IN
 * (MANAGER, ADMIN)} — generalised through {@link UserResolver#derivedRole}: a team's <em>lead</em>
 * (typically the creator, who is still a derived IC until someone reports to them) also has
 * authority, so onboarding's first creator can seed strategy. Plain ICs cannot. ADMIN crosses team
 * boundaries; everyone else is confined to their own team.
 *
 * <p>The owning {@code teamId} of a node is never taken from the request body — it is inherited from
 * the caller (Rally Cry) or the parent node (Objective/Outcome), so a caller cannot author strategy
 * into another tenant.
 */
@Service
public class StrategyService {

  /** Default Rally Cry horizon when the wizard supplies a title only. */
  private static final int DEFAULT_HORIZON_DAYS = 90;

  private final RallyCryRepository rallyCries;
  private final DefiningObjectiveRepository definingObjectives;
  private final OutcomeRepository outcomes;
  private final TeamRepository teams;
  private final UserResolver userResolver;

  public StrategyService(
      RallyCryRepository rallyCries,
      DefiningObjectiveRepository definingObjectives,
      OutcomeRepository outcomes,
      TeamRepository teams,
      UserResolver userResolver) {
    this.rallyCries = rallyCries;
    this.definingObjectives = definingObjectives;
    this.outcomes = outcomes;
    this.teams = teams;
    this.userResolver = userResolver;
  }

  /**
   * A team's strategy chain is complete once at least one Outcome exists for it — an Outcome implies
   * its parent Objective and Rally Cry. Null team (user not on a team yet) is never complete.
   */
  @Transactional(readOnly = true)
  public boolean isStrategySetupComplete(Long teamId) {
    return teamId != null && outcomes.existsByTeamId(teamId);
  }

  // ===================== Rally Cry =====================

  @Transactional
  public RallyCryDto createRallyCry(User caller, CreateRallyCryRequest req) {
    Long teamId = requireCallerTeam(caller);
    requireStrategyAuthority(caller, teamId);

    LocalDate start = req.horizonStart() != null ? req.horizonStart() : LocalDate.now();
    LocalDate end =
        req.horizonEnd() != null ? req.horizonEnd() : start.plusDays(DEFAULT_HORIZON_DAYS);
    if (end.isBefore(start)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "horizon end must be on or after horizon start");
    }

    RallyCry rc =
        RallyCry.builder()
            .title(req.title().trim())
            .narrative(blankToNull(req.narrative()))
            .teamId(teamId)
            .horizonStart(start)
            .horizonEnd(end)
            .status("ACTIVE")
            .build();
    return RallyCryDto.of(rallyCries.save(rc));
  }

  @Transactional
  public RallyCryDto updateRallyCry(User caller, Long id, UpdateRallyCryRequest req) {
    RallyCry rc =
        rallyCries
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "rally cry not found"));
    requireStrategyAuthority(caller, rc.getTeamId());

    if (req.title() != null) {
      String t = req.title().trim();
      if (t.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title cannot be blank");
      }
      rc.setTitle(t);
    }
    if (req.narrative() != null) rc.setNarrative(blankToNull(req.narrative()));
    if (req.horizonStart() != null) rc.setHorizonStart(req.horizonStart());
    if (req.horizonEnd() != null) rc.setHorizonEnd(req.horizonEnd());
    if (req.status() != null) rc.setStatus(req.status());
    if (rc.getHorizonEnd().isBefore(rc.getHorizonStart())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "horizon end must be on or after horizon start");
    }
    return RallyCryDto.of(rallyCries.save(rc));
  }

  @Transactional
  public void deleteRallyCry(User caller, Long id) {
    RallyCry rc =
        rallyCries
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "rally cry not found"));
    requireStrategyAuthority(caller, rc.getTeamId());
    rallyCries.delete(rc); // defining_objective / outcome cascade via FK ON DELETE CASCADE
  }

  // ===================== Defining Objective =====================

  @Transactional
  public DefiningObjectiveDto createDefiningObjective(
      User caller, CreateDefiningObjectiveRequest req) {
    RallyCry parent =
        rallyCries
            .findById(req.rallyCryId())
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "rally cry not found"));
    requireStrategyAuthority(caller, parent.getTeamId());

    DefiningObjective d =
        DefiningObjective.builder()
            .rallyCryId(parent.getId())
            .teamId(parent.getTeamId())
            .title(req.title().trim())
            .description(blankToNull(req.description()))
            .status("ACTIVE")
            .build();
    return DefiningObjectiveDto.of(definingObjectives.save(d));
  }

  @Transactional
  public DefiningObjectiveDto updateDefiningObjective(
      User caller, Long id, UpdateDefiningObjectiveRequest req) {
    DefiningObjective d =
        definingObjectives
            .findById(id)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "objective not found"));
    requireStrategyAuthority(caller, d.getTeamId());

    if (req.title() != null) {
      String t = req.title().trim();
      if (t.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title cannot be blank");
      }
      d.setTitle(t);
    }
    if (req.description() != null) d.setDescription(blankToNull(req.description()));
    if (req.status() != null) d.setStatus(req.status());
    return DefiningObjectiveDto.of(definingObjectives.save(d));
  }

  @Transactional
  public void deleteDefiningObjective(User caller, Long id) {
    DefiningObjective d =
        definingObjectives
            .findById(id)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "objective not found"));
    requireStrategyAuthority(caller, d.getTeamId());
    definingObjectives.delete(d); // outcome cascades via FK ON DELETE CASCADE
  }

  // ===================== Outcome =====================

  @Transactional
  public OutcomeRefDto createOutcome(User caller, CreateOutcomeRequest req) {
    DefiningObjective parent =
        definingObjectives
            .findById(req.definingObjectiveId())
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "objective not found"));
    requireStrategyAuthority(caller, parent.getTeamId());

    if (req.parentOutcomeId() != null) {
      Outcome parentOutcome =
          outcomes
              .findById(req.parentOutcomeId())
              .orElseThrow(
                  () ->
                      new ResponseStatusException(
                          HttpStatus.NOT_FOUND, "parent outcome not found"));
      if (!parentOutcome.getTeamId().equals(parent.getTeamId())) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "parent outcome belongs to a different team");
      }
    }

    Outcome o =
        Outcome.builder()
            .definingObjectiveId(parent.getId())
            .teamId(parent.getTeamId())
            .parentOutcomeId(req.parentOutcomeId())
            .title(req.title().trim())
            .description(blankToNull(req.description()))
            .metricType(req.metricType() != null ? req.metricType() : "NUMBER")
            .targetValue(req.targetValue())
            .baselineValue(req.baselineValue())
            .priorityTier(req.priorityTier() != null ? req.priorityTier() : "P1")
            .status("ACTIVE")
            .build();
    return toRefDto(outcomes.save(o), parent);
  }

  @Transactional
  public OutcomeRefDto updateOutcome(User caller, Long id, UpdateOutcomeRequest req) {
    Outcome o =
        outcomes
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "outcome not found"));
    requireStrategyAuthority(caller, o.getTeamId());

    if (req.title() != null) {
      String t = req.title().trim();
      if (t.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title cannot be blank");
      }
      o.setTitle(t);
    }
    if (req.description() != null) o.setDescription(blankToNull(req.description()));
    if (req.metricType() != null) o.setMetricType(req.metricType());
    if (req.targetValue() != null) o.setTargetValue(req.targetValue());
    if (req.baselineValue() != null) o.setBaselineValue(req.baselineValue());
    if (req.currentValue() != null) o.setCurrentValue(req.currentValue());
    if (req.priorityTier() != null) o.setPriorityTier(req.priorityTier());
    if (req.status() != null) o.setStatus(req.status());

    Outcome saved = outcomes.save(o);
    DefiningObjective parent = definingObjectives.findById(saved.getDefiningObjectiveId()).orElse(null);
    return toRefDto(saved, parent);
  }

  // ===================== helpers =====================

  private OutcomeRefDto toRefDto(Outcome o, DefiningObjective parent) {
    RallyCry rc =
        parent == null ? null : rallyCries.findById(parent.getRallyCryId()).orElse(null);
    return new OutcomeRefDto(
        o.getId(),
        o.getTitle(),
        o.getPriorityTier(),
        parent == null ? null : parent.getId(),
        parent == null ? null : parent.getTitle(),
        rc == null ? null : rc.getId(),
        rc == null ? null : rc.getTitle());
  }

  private Long requireCallerTeam(User caller) {
    Long teamId = caller.getTeamId();
    if (teamId == null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "create a team before authoring strategy");
    }
    return teamId;
  }

  /**
   * {@code requireSameTeam(caller, teamId) && role IN (MANAGER, ADMIN)} — with the team lead
   * (creator) admitted even while their derived role is still IC. ADMIN bypasses the same-team check.
   */
  private void requireStrategyAuthority(User caller, Long teamId) {
    UserRole role = userResolver.derivedRole(caller);
    if (role == UserRole.ADMIN) return;

    if (caller.getTeamId() == null || !caller.getTeamId().equals(teamId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not a member of this team");
    }
    Team team =
        teams
            .findById(teamId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "team not found"));
    boolean isLead =
        team.getLeadUserId() != null && team.getLeadUserId().equals(caller.getId());
    if (role == UserRole.MANAGER || isLead) return;

    throw new ResponseStatusException(
        HttpStatus.FORBIDDEN, "only team admins or managers may author strategy");
  }

  private static String blankToNull(String s) {
    if (s == null) return null;
    String t = s.trim();
    return t.isEmpty() ? null : t;
  }
}
