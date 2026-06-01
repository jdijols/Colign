/**
 * Cross-session resume state for the strategy onboarding wizard.
 *
 * The wizard creates Rally Cry → Defining Objective → Outcome across three
 * screens. We persist the ids of nodes already created (keyed by team) so that:
 *   - "Back" from a later step preserves the earlier node rather than orphaning
 *     a duplicate when the user moves forward again, and
 *   - closing the browser mid-wizard resumes at the last completed step on the
 *     next sign-in (same browser).
 *
 * Server truth still wins: once an Outcome exists, `me.strategySetupComplete`
 * flips true and the gate stops showing the wizard entirely, so this cache is
 * only ever consulted while the chain is incomplete. It is cleared on
 * completion. (A different browser/device with no cache simply restarts the
 * wizard — acceptable for V1; full server-side resume is a later slice.)
 */

const KEY_PREFIX = "colign:strategy-wizard:";

export interface StrategyWizardState {
  rallyCryId?: number;
  definingObjectiveId?: number;
}

function key(teamId: number): string {
  return `${KEY_PREFIX}${teamId}`;
}

export function readWizardState(teamId: number | null | undefined): StrategyWizardState {
  if (teamId == null || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key(teamId));
    return raw ? (JSON.parse(raw) as StrategyWizardState) : {};
  } catch {
    return {};
  }
}

export function writeWizardState(
  teamId: number | null | undefined,
  patch: StrategyWizardState,
): void {
  if (teamId == null || typeof window === "undefined") return;
  try {
    const next = { ...readWizardState(teamId), ...patch };
    window.localStorage.setItem(key(teamId), JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode / quota) — wizard still works in-session */
  }
}

export function clearWizardState(teamId: number | null | undefined): void {
  if (teamId == null || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(teamId));
  } catch {
    /* no-op */
  }
}
