package com.colign.repository;

import com.colign.domain.RallyCry;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RallyCryRepository extends JpaRepository<RallyCry, Long> {

  /** Team-scoped read for the strategy wizard / picker. */
  List<RallyCry> findByTeamId(Long teamId);
}
