package com.wc.repository;

import com.wc.domain.Plan;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanRepository extends JpaRepository<Plan, Long> {

    Optional<Plan> findByUserIdAndWeekStartDate(Long userId, LocalDate weekStartDate);

    Page<Plan> findByUserId(Long userId, Pageable pageable);

    Optional<Plan> findFirstByUserIdOrderByWeekStartDateDesc(Long userId);
}
