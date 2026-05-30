import { useMemo, useState } from "react";
import { Button, Label, Select, TextInput, Textarea, Alert } from "flowbite-react";
import { HiInformationCircle, HiX, HiCheck } from "react-icons/hi";
import { useAddCommitMutation } from "@/api/commits";
import { useListOutcomesQuery } from "@/api/outcomes";
import { useListChessTagsQuery } from "@/api/chessTags";
import type { OutcomeRefDto } from "@/api/types";

interface Props {
  planId: number;
  onDone: () => void;
  onCancel: () => void;
}

export function CommitForm({ planId, onDone, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [outcomeId, setOutcomeId] = useState<number | "">("");
  const [chessTagId, setChessTagId] = useState<number | "">("");
  const [plannedHours, setPlannedHours] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [addCommit, { isLoading: submitting }] = useAddCommitMutation();
  const { data: outcomesPage, isLoading: loadingOutcomes } = useListOutcomesQuery({ size: 200 });
  const { data: chessTags, isLoading: loadingTags } = useListChessTagsQuery();

  // Group outcomes by RallyCry → DefiningObjective so the dropdown shows
  // the full strategy chain to help the IC pick the right leaf.
  const grouped = useMemo(() => {
    const map = new Map<string, { rallyCry: string; objectives: Map<string, OutcomeRefDto[]> }>();
    (outcomesPage?.content ?? []).forEach((o) => {
      const rcKey = o.rallyCryTitle ?? "(no rally cry)";
      if (!map.has(rcKey)) {
        map.set(rcKey, { rallyCry: rcKey, objectives: new Map<string, OutcomeRefDto[]>() });
      }
      const rc = map.get(rcKey)!;
      const doKey = o.definingObjectiveTitle ?? "(no objective)";
      if (!rc.objectives.has(doKey)) rc.objectives.set(doKey, []);
      rc.objectives.get(doKey)!.push(o);
    });
    return Array.from(map.values());
  }, [outcomesPage]);

  function valid(): boolean {
    return !!title.trim() && outcomeId !== "" && title.length <= 200;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!valid()) {
      setSubmitError("Title and outcome are required.");
      return;
    }
    try {
      await addCommit({
        planId,
        body: {
          title: title.trim(),
          description: description.trim() || undefined,
          outcomeId: outcomeId as number,
          chessTagId: chessTagId === "" ? undefined : (chessTagId as number),
          plannedEffortHours: plannedHours ? Number(plannedHours) : undefined,
        },
      }).unwrap();
      onDone();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to add commit");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
      aria-label="Add a weekly commit"
    >
      <div>
        <Label htmlFor="commit-title" value="What are you committing to?" />
        <TextInput
          id="commit-title"
          data-cy="commit-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          placeholder="e.g. Ship the onboarding redesign"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-gray-500">{title.length}/200</p>
      </div>

      <div>
        <Label htmlFor="commit-description" value="Details (optional)" />
        <Textarea
          id="commit-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does done look like?"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="commit-outcome" value="Which Outcome does this support?" />
        <Select
          id="commit-outcome"
          value={outcomeId}
          onChange={(e) => setOutcomeId(e.target.value === "" ? "" : Number(e.target.value))}
          required
          disabled={loadingOutcomes}
          className="mt-1"
        >
          <option value="">
            {loadingOutcomes ? "Loading outcomes…" : "— Select an Outcome —"}
          </option>
          {grouped.map((rc) => (
            <optgroup key={rc.rallyCry} label={`Rally Cry: ${rc.rallyCry}`}>
              {Array.from(rc.objectives.entries()).flatMap(([doTitle, outcomes]) =>
                outcomes.map((o) => (
                  <option key={o.id} value={o.id}>
                    [{o.priorityTier}] {o.title} — {doTitle}
                  </option>
                ))
              )}
            </optgroup>
          ))}
        </Select>
        <p className="mt-1 text-xs text-gray-500">
          Every commit must link to a leaf Outcome. This is the structural alignment
          that 15-Five doesn't enforce.
        </p>
      </div>

      <div>
        <Label htmlFor="commit-chess" value="Chess layer (posture)" />
        <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label="Chess layer">
          {(chessTags ?? []).map((t) => {
            const active = chessTagId === t.id;
            const colorMap: Record<string, string> = {
              OFFENSE: active ? "bg-green-600 text-white" : "bg-green-50 text-green-800 hover:bg-green-100 dark:bg-green-950 dark:text-green-200",
              DEFENSE: active ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200",
              MAINTENANCE: active ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200",
            };
            return (
              <button
                type="button"
                key={t.id}
                role="radio"
                aria-checked={active}
                onClick={() => setChessTagId(active ? "" : t.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${colorMap[t.code] ?? colorMap.MAINTENANCE}`}
              >
                {t.label}
              </button>
            );
          })}
          {loadingTags ? <span className="text-xs text-gray-500">Loading…</span> : null}
        </div>
      </div>

      <div>
        <Label htmlFor="commit-hours" value="Planned effort (hours, optional)" />
        <TextInput
          id="commit-hours"
          type="number"
          min={0}
          max={80}
          step={0.5}
          value={plannedHours}
          onChange={(e) => setPlannedHours(e.target.value)}
          className="mt-1 max-w-32"
        />
      </div>

      {submitError && (
        <Alert color="failure" icon={HiInformationCircle}>
          {submitError}
        </Alert>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button color="light" onClick={onCancel} type="button">
          <HiX className="mr-1 h-4 w-4" /> Cancel
        </Button>
        <Button type="submit" disabled={submitting || !valid()} data-cy="save-commit">
          <HiCheck className="mr-1 h-4 w-4" />
          {submitting ? "Adding…" : "Save commit"}
        </Button>
      </div>
    </form>
  );
}
