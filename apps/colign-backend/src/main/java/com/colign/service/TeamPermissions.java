package com.colign.service;

import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;

/**
 * Workspace-settings authorization. Mirrors {@code canManageTeam} on the
 * frontend (apps/colign-frontend/src/lib/permissions.ts) — keep both in sync.
 *
 * MANAGER and ADMIN may manage by stored role; an IC may also manage iff they
 * are the team lead, so a solo lead with no reports yet can still rename their
 * own workspace.
 *
 * Note: backend semantics intentionally differ slightly from the frontend
 * helper — BE requires a non-null Team (the controller always loads the team
 * before checking permission), while the FE allows ADMIN/MANAGER through
 * before the team query resolves. See FE permissions.ts for the rationale.
 */
public final class TeamPermissions {

  private TeamPermissions() {}

  public static boolean canManage(User user, Team team) {
    if (user == null || team == null) return false;
    if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.MANAGER) return true;
    Long leadId = team.getLeadUserId();
    return leadId != null && leadId.equals(user.getId());
  }
}
