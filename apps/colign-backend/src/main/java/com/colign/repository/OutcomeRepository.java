package com.colign.repository;

import com.colign.domain.Outcome;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutcomeRepository extends JpaRepository<Outcome, Long> {

  Page<Outcome> findByStatus(String status, Pageable pageable);

  /** Team-scoped Outcome picker (read endpoints filter by caller team). */
  Page<Outcome> findByTeamId(Long teamId, Pageable pageable);

  List<Outcome> findByDefiningObjectiveId(Long definingObjectiveId);

  /**
   * Drives {@code MeDto.strategySetupComplete}: a team's strategy chain is complete once at least
   * one Outcome exists for it (an Outcome's existence implies its parent Objective and Rally Cry).
   */
  boolean existsByTeamId(Long teamId);
}
