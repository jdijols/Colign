import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useGetMeQuery } from "@/api/me";
import { useCreateDefiningObjectiveMutation } from "@/api/strategy";
import { StrategyWizardShell } from "@/components/StrategyWizardShell";
import { WizardLoading, messageFor } from "@/pages/StrategyRallyCryPage";
import { readWizardState, writeWizardState } from "@/lib/strategyWizard";

/**
 * Strategy onboarding — Step 2 of 3: one Defining Objective under the Rally Cry.
 * Requires the Step-1 Rally Cry id (from resume state); if it's missing the user
 * is sent back to Step 1. "Back" preserves the Rally Cry — it is never deleted.
 */
export function StrategyObjectivePage() {
  const navigate = useNavigate();
  const { data: me, isLoading } = useGetMeQuery();
  const [createObjective, { isLoading: saving }] = useCreateDefiningObjectiveMutation();
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
  // No Rally Cry yet → restart at Step 1 (it preserves any prior node).
  if (state.rallyCryId == null) return <Navigate to="../rally-cry" relative="path" replace />;

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed || saving || state.rallyCryId == null) return;
    try {
      if (state.definingObjectiveId) {
        navigate("../outcome", { relative: "path" });
        return;
      }
      const obj = await createObjective({
        rallyCryId: state.rallyCryId,
        title: trimmed,
      }).unwrap();
      writeWizardState(teamId, { definingObjectiveId: obj.id });
      navigate("../outcome", { relative: "path" });
    } catch (err) {
      setError(messageFor(err));
    }
  }

  return (
    <StrategyWizardShell
      step={2}
      headline="Name your team's Defining Objective"
      subhead="A concrete objective that moves the Rally Cry forward this horizon. One is enough to get started — you can add more later."
      inputLabel="Defining Objective"
      placeholder="e.g. Cut time-to-first-value in half"
      value={title}
      onChange={setTitle}
      onSubmit={submit}
      ctaLabel="Create Objective"
      isSubmitting={saving}
      error={error}
      onBack={() => navigate("../rally-cry", { relative: "path" })}
    />
  );
}
