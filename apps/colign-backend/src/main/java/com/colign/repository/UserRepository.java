package com.colign.repository;

import com.colign.domain.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

  Optional<User> findByEmail(String email);

  Optional<User> findByAuth0Sub(String auth0Sub);

  Page<User> findByManagerId(Long managerId, Pageable pageable);

  /** Count of direct reports — drives MANAGER role derivation. */
  long countByManagerId(Long managerId);

  /** Members on a team — drives the create→invite→app onboarding gate. */
  long countByTeamId(Long teamId);

  /** All members of a team, ordered by displayName via Pageable. */
  Page<User> findByTeamId(Long teamId, Pageable pageable);

  /** Count members of a team, excluding one user (used to compute "last member" cases). */
  long countByTeamIdAndIdNot(Long teamId, Long excludedUserId);

  /** All users whose manager is the given user — drives the orphan cascade on remove. */
  List<User> findByManagerId(Long managerId);
}
