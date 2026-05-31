package com.wc.repository;

import com.wc.domain.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByAuth0Sub(String auth0Sub);

    org.springframework.data.domain.Page<User> findByManagerId(
            Long managerId, org.springframework.data.domain.Pageable pageable);

    /** Count of direct reports — drives MANAGER role derivation. */
    long countByManagerId(Long managerId);
}
