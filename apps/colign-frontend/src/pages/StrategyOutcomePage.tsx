import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useGetMeQuery } from "@/api/me";
import { useCreateOutcomeMutation } from "@/api/strategy";
import { StrategyWizardShell } from "@/components/StrategyWizardShell";
import { WizardLoading, messageFor } from "@/pages/StrategyRallyCryPage";
import { clearWizardState, readWizardState } from "@/lib/strategyWizard";

/**
 * Strategy onboarding — Step 3 of 3: one measurable Outcome under the Objective.
 * Creating it completes the chain (`me.strategySetupComplete` flips true), clears
 * the wizard resume cache, and advances to the invite step (Step 4). Requires the
 * Step-2 Objective id; missing → back to Step 2. "Back" preserves the Objective.
 */
export function StrategyOutcomePage() {
  const navigate = useNavigate();
  const { data: me, isLoading } = useGetMeQuery();
  const [createOutcome, { isLoading: saving }] = useCreateOutcomeMutation();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const teamId = me?.teamId ?? null;
  const state = readWizardState(teamId);

  useEffect(() => {
    setError(null);
  }, [title]);

  if (isLoading) return <WizardLoading />;
  if (!me || me.teamId == null) return <Navigate to="../../.." relative="path" replace />;
  if (me.strategySetupComplete) return <Navigate to="../../.." relative="path" replace />;
  if (state.definingObjectiveId == null)
    return <Navigate to="../objective" relative="path" replace />;

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed || saving || state.definingObjectiveId == null) return;
    try {
      await createOutcome({
        definingObjectiveId: state.definingObjectiveId,
        title: trimmed,
      }).unwrap();
      clearWizardState(teamId);
      // Strategy is now complete; head to the invite step (Step 4). The getMe
      // invalidation from createOutcome re-routes the gate to the app behind it.
      navigate("../../invite", { relative: "path" });
    } catch (err) {
      setError(messageFor(err));
    }
  }

  return (
    <StrategyWizardShell
      step={3}
      headline="Name your team's first Outcome"
      subhead="A measurable result that proves the Objective is working. This is what your team's weekly commits will line up against."
      inputLabel="Outcome"
      placeholder="e.g. Median onboarding time under 1 day"
      value={title}
      onChange={setTitle}
      onSubmit={submit}
      ctaLabel="Create Outcome"
      isSubmitting={saving}
      error={error}
      onBack={() => navigate("../objective", { relative: "path" })}
    />
  );
}
