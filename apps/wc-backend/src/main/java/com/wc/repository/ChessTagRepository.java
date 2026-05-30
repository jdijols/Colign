package com.wc.repository;

import com.wc.domain.ChessTag;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChessTagRepository extends JpaRepository<ChessTag, Long> {

    List<ChessTag> findAllByOrderByPriorityRankAsc();
}
