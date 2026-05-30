package com.wc.repository;

import com.wc.domain.Outcome;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutcomeRepository extends JpaRepository<Outcome, Long> {

    Page<Outcome> findByStatus(String status, Pageable pageable);
}
