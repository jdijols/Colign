package com.colign.repository;

import com.colign.domain.ChessTag;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChessTagRepository extends JpaRepository<ChessTag, Long> {

    List<ChessTag> findAllByOrderByPriorityRankAsc();
}
