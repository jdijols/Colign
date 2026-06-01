package com.colign.repository;

import com.colign.domain.Invitation;
import com.colign.domain.InvitationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvitationRepository extends JpaRepository<Invitation, Long> {

    Optional<Invitation> findByToken(String token);

    /**
     * Used to short-circuit duplicate sends: if the same email is already
     * pending on the same team we surface the existing invitation rather
     * than spawning a second one (the recipient already has a live link).
     */
    Optional<Invitation> findFirstByEmailIgnoreCaseAndTeamIdAndStatus(
            String email, Long teamId, InvitationStatus status);

    /** All invitations a team has issued, newest first — drives the members screen. */
    List<Invitation> findByTeamIdOrderByCreatedDateDesc(Long teamId);

    /** How many invitations a team has issued — drives the onboarding gate
     *  (a lead who hasn't invited anyone yet is routed to the invite step). */
    long countByTeamId(Long teamId);
}
