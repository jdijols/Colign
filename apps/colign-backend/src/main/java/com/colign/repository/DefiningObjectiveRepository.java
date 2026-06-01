package com.colign.repository;

import com.colign.domain.DefiningObjective;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DefiningObjectiveRepository extends JpaRepository<DefiningObjective, Long> {

  /** Team-scoped read (Objective picker / strategy review), newest-agnostic order. */
  List<DefiningObjective> findByTeamId(Long teamId);

  List<DefiningObjective> findByRallyCryId(Long rallyCryId);
}
