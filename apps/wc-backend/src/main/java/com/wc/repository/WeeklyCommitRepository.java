package com.wc.repository;

import com.wc.domain.CommitStatus;
import com.wc.domain.WeeklyCommit;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeeklyCommitRepository extends JpaRepository<WeeklyCommit, Long> {

    List<WeeklyCommit> findByPlanIdOrderByOrdinalAsc(Long planId);

    List<WeeklyCommit> findByPlanIdAndStatusIn(Long planId, List<CommitStatus> statuses);

    int countByPlanId(Long planId);
}
