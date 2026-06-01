import { useEffect, useMemo, useState } from "react";
import { HiCheck, HiX } from "react-icons/hi";
import { useAddCommitMutation } from "@/api/commits";
import { useListOutcomesQuery } from "@/api/outcomes";
import { useListChessTagsQuery } from "@/api/chessTags";
import type { OutcomeRefDto } from "@/api/types";
import { Alert, Button, Card, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { radioGroupKeyDown, radioTabIndex } from "@/lib/radioGroup";

interface Props {
  planId: number;
  onDone: () => void;
  onCancel: () => void;
}

const CHESS_TONES: Record<string, string> = {
  OFFENSE:
    "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70",
  DEFENSE:
    "border-amber-400 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/40 dark:hover:bg-amber-950/70",
  MAINTENANCE:
    "border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:bg-neutral-900 dark:hover:bg-neutral-800",
};

const CHESS_ACTIVE: Record<string, string> = {
  OFFENSE:
    "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500",
  DEFENSE: "bg-amber-500 text-neutral-900 border-amber-600",
  MAINTENANCE:
    "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white",
};

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

  // Pre-select the Outcome when the team has exactly one. Saves a click on
  // the empty-plan happy path right after the strategy wizard and keeps the
  // continuity from "I just defined this Outcome" → "now I'll commit to it".
  // No-op when the user has already chosen one, when there are 0 or 2+
  // Outcomes, or while outcomes are still loading.
  useEffect(() => {
    if (outcomeId !== "") return;
    const all = outcomesPage?.content ?? [];
    if (all.length === 1) setOutcomeId(all[0]!.id);
  }, [outcomesPage, outcomeId]);

  const grouped = useMemo(() => {
    const map = new Map<string, { rallyCry: string; objectives: Map<string, OutcomeRefDto[]> }>();
    (outcomesPage?.content ?? []).forEach((o) => {
      const rcKey = o.rallyCryTitle ?? "(no rally cry)";
      if (!map.has(rcKey)) {
        map.set(rcKey, {
          rallyCry: rcKey,
          objectives: new Map<string, OutcomeRefDto[]>(),
        });
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
    <Card>
      <form onSubmit={submit} aria-label="Add a weekly commit">
        <div className="px-5 py-4 space-y-4">
          <Field
            label="What are you committing to?"
            htmlFor="commit-title"
            required
            hint={`${title.length}/200`}
          >
            <Input
              id="commit-title"
              data-cy="commit-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              placeholder="e.g. Ship the onboarding redesign"
            />
          </Field>

          <Field label="Details" htmlFor="commit-description" hint="optional">
            <Textarea
              id="commit-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does done look like?"
            />
          </Field>

          <Field
            label="Which Outcome does this support?"
            htmlFor="commit-outcome"
            required
            helpText="Every commit must link to a leaf Outcome — the structural alignment 15-Five doesn't enforce."
          >
            <Select
              id="commit-outcome"
              data-cy="commit-outcome-select"
              value={outcomeId}
              onChange={(e) => setOutcomeId(e.target.value === "" ? "" : Number(e.target.value))}
              required
              disabled={loadingOutcomes}
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
                    )),
                  )}
                </optgroup>
              ))}
            </Select>
          </Field>

          <Field label="Chess layer" hint="posture">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Chess layer">
              {(() => {
                const tags = chessTags ?? [];
                const currentIdx = tags.findIndex((t) => t.id === chessTagId);
                const onKeyDown = radioGroupKeyDown(tags, currentIdx, (next) =>
                  setChessTagId(next.id),
                );
                return tags.map((t, idx) => {
                  const active = chessTagId === t.id;
                  const base = CHESS_TONES[t.code] ?? CHESS_TONES.MAINTENANCE;
                  const activeClass = CHESS_ACTIVE[t.code] ?? CHESS_ACTIVE.MAINTENANCE;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      role="radio"
                      aria-checked={active}
                      tabIndex={radioTabIndex(active, currentIdx < 0 && idx === 0)}
                      onClick={() => setChessTagId(active ? "" : t.id)}
                      onKeyDown={onKeyDown}
                      className={cn(
                        "inline-flex items-center rounded-md border text-xs font-medium px-2.5 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-1",
                        active ? activeClass : base,
                      )}
                    >
                      {t.label}
                    </button>
                  );
                });
              })()}
              {loadingTags ? (
                <span className="text-xs text-neutral-600 self-center">
                  <Spinner size="sm" />
                </span>
              ) : null}
            </div>
          </Field>

          <Field label="Planned effort" htmlFor="commit-hours" hint="hours, optional">
            <Input
              id="commit-hours"
              type="number"
              min={0}
              max={80}
              step={0.5}
              value={plannedHours}
              onChange={(e) => setPlannedHours(e.target.value)}
              className="max-w-32 tabular-nums"
            />
          </Field>

          {submitError && <Alert tone="danger">{submitError}</Alert>}
        </div>

        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            type="button"
            leftIcon={<HiX className="h-3.5 w-3.5" />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !valid()}
            data-cy="save-commit"
            leftIcon={submitting ? <Spinner size="sm" /> : <HiCheck className="h-3.5 w-3.5" />}
          >
            {submitting ? "Adding…" : "Save commit"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
