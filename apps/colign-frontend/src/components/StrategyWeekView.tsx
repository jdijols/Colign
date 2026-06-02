import { useEffect, useMemo, useRef, useState } from "react";
import { HiPlus, HiX } from "react-icons/hi";
import { useListOutcomesQuery } from "@/api/outcomes";
import { useCreateOutcomeMutation, useDeleteOutcomeMutation } from "@/api/strategy";
import type { OutcomeRefDto } from "@/api/types";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { priorityTone } from "@/lib/tokens";
import { formatWeekOf, weekEnd } from "@/lib/weeks";

interface Props {
  /** The selected week, identified by its Monday ("YYYY-MM-DD"). */
  week: string;
  /** When true, show add/remove affordances. Goals passes this only for the current week. */
  editable?: boolean;
}

interface ObjectiveGroup {
  definingObjectiveId: number | null;
  definingObjectiveTitle: string | null;
  outcomes: OutcomeRefDto[];
}

interface RallyCryGroup {
  rallyCryId: number | null;
  rallyCryTitle: string | null;
  objectives: ObjectiveGroup[];
}

/**
 * Group a flat outcome list into the RC → Defining Objective → Outcome tree,
 * preserving first-seen order at each level.
 */
function groupStrategy(outcomes: OutcomeRefDto[]): RallyCryGroup[] {
  const order: (number | null)[] = [];
  const byRc = new Map<number | null, RallyCryGroup>();

  for (const o of outcomes) {
    let rc = byRc.get(o.rallyCryId);
    if (!rc) {
      rc = { rallyCryId: o.rallyCryId, rallyCryTitle: o.rallyCryTitle, objectives: [] };
      byRc.set(o.rallyCryId, rc);
      order.push(o.rallyCryId);
    }
    let dobj = rc.objectives.find((d) => d.definingObjectiveId === o.definingObjectiveId);
    if (!dobj) {
      dobj = {
        definingObjectiveId: o.definingObjectiveId,
        definingObjectiveTitle: o.definingObjectiveTitle,
        outcomes: [],
      };
      rc.objectives.push(dobj);
    }
    dobj.outcomes.push(o);
  }

  return order.map((id) => byRc.get(id)!);
}

/**
 * The strategy tree "as of" the selected week: an element shows when it was
 * created on or before that week's end and not yet retired by then. Before
 * anything was established, shows an empty state. When `editable`, the current
 * week can add Outcomes to an existing Objective and retire (soft-delete) them;
 * retiring drops an Outcome from this week forward while past weeks keep it.
 */
export function StrategyWeekView({ week, editable = false }: Props) {
  const { data, isLoading } = useListOutcomesQuery({ size: 200, includeRetired: true });
  const [createOutcome, { isLoading: creating }] = useCreateOutcomeMutation();
  const [deleteOutcome, { isLoading: deleting }] = useDeleteOutcomeMutation();

  const [removeTarget, setRemoveTarget] = useState<OutcomeRefDto | null>(null);
  const [addingDoId, setAddingDoId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const groups = useMemo(() => {
    const end = weekEnd(week);
    const established = (data?.content ?? []).filter((o) => {
      const created = o.createdDate ? o.createdDate.slice(0, 10) <= end : true;
      const notRetired = !o.effectiveTo || o.effectiveTo.slice(0, 10) > end;
      return created && notRetired;
    });
    return groupStrategy(established);
  }, [data, week]);

  async function submitAdd(definingObjectiveId: number) {
    const title = newTitle.trim();
    if (!title) return;
    await createOutcome({ definingObjectiveId, title }).unwrap();
    setNewTitle("");
    setAddingDoId(null);
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    await deleteOutcome(removeTarget.id).unwrap();
    setRemoveTarget(null);
  }

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center" data-cy="strategy-week-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center text-center px-6 py-14">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            No goals established yet
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
            Nothing was in place as of the week of {formatWeekOf(week)}. Step forward to the week
            your strategy was set.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-cy="strategy-week-view">
      {groups.map((rc) => (
        <Card key={rc.rallyCryId ?? rc.rallyCryTitle ?? "rc"}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-600">Rally Cry</p>
              <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                {rc.rallyCryTitle ?? "Untitled Rally Cry"}
              </h2>
            </div>
            {rc.objectives.map((dobj) => (
              <div
                key={dobj.definingObjectiveId ?? dobj.definingObjectiveTitle ?? "do"}
                className="border-l-2 border-neutral-200 dark:border-neutral-800 pl-4 space-y-2"
              >
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {dobj.definingObjectiveTitle ?? "Untitled Objective"}
                </p>
                <ul className="space-y-1.5">
                  {dobj.outcomes.map((o) => (
                    <li key={o.id} className="flex items-center gap-2 text-sm group">
                      <Badge tone={priorityTone(o.priorityTier)} size="xs">
                        {o.priorityTier}
                      </Badge>
                      <span className="text-neutral-900 dark:text-neutral-50">{o.title}</span>
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(o)}
                          aria-label={`Remove ${o.title}`}
                          data-cy={`remove-outcome-${o.id}`}
                          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                          <HiX className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {editable && dobj.definingObjectiveId != null ? (
                  <AddOutcome
                    open={addingDoId === dobj.definingObjectiveId}
                    title={newTitle}
                    busy={creating}
                    onOpen={() => {
                      setAddingDoId(dobj.definingObjectiveId);
                      setNewTitle("");
                    }}
                    onChange={setNewTitle}
                    onCancel={() => setAddingDoId(null)}
                    onSubmit={() => submitAdd(dobj.definingObjectiveId!)}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ))}

      <ConfirmDialog
        open={removeTarget != null}
        title={removeTarget ? `Remove "${removeTarget.title}"?` : ""}
        body={
          <p>
            It stops showing from this week forward. Past weeks still show it, so your history stays
            intact.
          </p>
        }
        confirmLabel={deleting ? "Removing…" : "Remove outcome"}
        destructive
        onCancel={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
      />
    </div>
  );
}

function AddOutcome({
  open,
  title,
  busy,
  onOpen,
  onChange,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  busy: boolean;
  onOpen: () => void;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        data-cy="add-outcome"
        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded"
      >
        <HiPlus className="h-3.5 w-3.5" aria-hidden /> Add outcome
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex items-center gap-2"
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => onChange(e.target.value)}
        placeholder="New outcome…"
        data-cy="add-outcome-input"
        className="flex-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
      />
      <Button type="submit" size="sm" disabled={busy || !title.trim()} data-cy="add-outcome-save">
        {busy ? "Adding…" : "Add"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}
