import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useGetMeQuery } from "@/api/me";
import { useCreateRallyCryMutation } from "@/api/strategy";
import { StrategyWizardShell } from "@/components/StrategyWizardShell";
import { readWizardState, writeWizardState } from "@/lib/strategyWizard";

/**
 * Strategy onboarding — Step 1 of 3: name the team's Rally Cry (the top of the
 * RC → Defining Objective → Outcome chain). Lives outside OnboardingGate (it is
 * how an author completes setup), so it self-guards: teamless users bounce to
 * create-team, and a team that already has strategy bounces to the app.
 */
export function StrategyRallyCryPage() {
  const navigate = useNavigate();
  const { data: me, isLoading } = useGetMeQuery();
  const [createRallyCry, { isLoading: saving }] = useCreateRallyCryMutation();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Resume: if a Rally Cry was already created this session, prefill its title
  // hint isn't available (we only persist ids), but we keep the id so moving
  // forward reuses it instead of creating a duplicate.
  const teamId = me?.teamId ?? null;
  const existing = readWizardState(teamId);

  useEffect(() => {
    setError(null);
  }, [title]);

  if (isLoading) return <WizardLoading />;
  if (!me || me.teamId == null) return <Navigate to="../.." relative="path" replace />;
  if (me.strategySetupComplete) return <Navigate to="../../.." relative="path" replace />;

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    try {
      // If we already created one this session, skip straight ahead rather than
      // making a second Rally Cry.
      if (existing.rallyCryId) {
        navigate("../objective", { relative: "path" });
        return;
      }
      const rc = await createRallyCry({ title: trimmed }).unwrap();
      writeWizardState(teamId, { rallyCryId: rc.id });
      navigate("../objective", { relative: "path" });
    } catch (err) {
      setError(messageFor(err));
    }
  }

  return (
    <StrategyWizardShell
      step={1}
      headline="Name your team's Rally Cry"
      subhead="The North-Star theme that frames the work — the why behind the quarter. Everything your team commits to should ladder up to this."
      inputLabel="Rally Cry"
      placeholder="e.g. Ship faster, support stronger"
      value={title}
      onChange={setTitle}
      onSubmit={submit}
      ctaLabel="Create Rally Cry"
      isSubmitting={saving}
      error={error}
    />
  );
}

export function WizardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</span>
    </div>
  );
}

export function messageFor(err: unknown): string {
  const status = (err as { status?: number })?.status;
  if (status === 403) return "You don't have permission to set up strategy for this team.";
  if (status === 401) return "Your session expired. Please sign in again.";
  return "Something went wrong. Please try again.";
}
