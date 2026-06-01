package com.colign.repository;

import com.colign.domain.Reconciliation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReconciliationRepository extends JpaRepository<Reconciliation, Long> {

  Optional<Reconciliation> findByWeeklyCommitId(Long weeklyCommitId);

  List<Reconciliation> findByWeeklyCommitIdIn(List<Long> weeklyCommitIds);
}
