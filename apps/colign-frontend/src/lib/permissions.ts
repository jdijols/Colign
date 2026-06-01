import type { MeDto } from "@/api/me";

/**
 * True when the caller may rename the team, set its avatar, or remove members.
 * Mirrors the backend rule: MANAGER or ADMIN by derived role, OR the team
 * lead (`team.leadUserId == me.id`) so a solo lead can still manage their own
 * workspace even before they have direct reports. Keep this in sync with
 * TeamPermissions on the backend.
 */
export function canManageTeam(
  me: { id: number; role: "IC" | "MANAGER" | "ADMIN" } | null,
  team: { leadUserId: number | null } | null,
): boolean {
  if (!me) return false;
  if (me.role === "ADMIN" || me.role === "MANAGER") return true;
  if (!team) return false;
  return team.leadUserId === me.id;
}
