import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineSwitchHorizontal, HiPlus, HiX } from "react-icons/hi";
import { useListOutcomesQuery } from "@/api/outcomes";
import {
  useCreateDefiningObjectiveMutation,
  useCreateOutcomeMutation,
  useDeleteDefiningObjectiveMutation,
  useDeleteOutcomeMutation,
  useDeleteRallyCryMutation,
  useRenameDefiningObjectiveMutation,
  useRenameOutcomeMutation,
  useRenameRallyCryMutation,
} from "@/api/strategy";
import type { OutcomeRefDto } from "@/api/types";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/cn";
import { priorityTone } from "@/lib/tokens";
import { formatWeekOf, weekEnd } from "@/lib/weeks";

interface Props {
  /** The selected week, identified by its Monday ("YYYY-MM-DD"). */
  week: string;
  /** When true, show add/remove/pivot affordances. Goals passes this only for the current week. */
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

/** Group a flat outcome list into the RC → Defining Objective → Outcome tree, preserving order. */
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
 * created on or before that week's end and not yet retired by then. When
 * `editable` (current week only), supports adding Outcomes to an Objective,
 * adding an Objective (with its first Outcome), retiring Outcomes/Objectives
 * (soft-delete), and pivoting the Rally Cry. Edits are non-destructive — past
 * weeks keep what they showed.
 */
export function StrategyWeekView({ week, editable = false }: Props) {
  const navigate = useNavigate();
  const { data, isLoading } = useListOutcomesQuery({ size: 200, includeRetired: true });
  const [createOutcome, { isLoading: creatingOutcome }] = useCreateOutcomeMutation();
  const [deleteOutcome, { isLoading: deletingOutcome }] = useDeleteOutcomeMutation();
  const [createObjective, { isLoading: creatingObjective }] = useCreateDefiningObjectiveMutation();
  const [deleteObjective, { isLoading: deletingObjective }] = useDeleteDefiningObjectiveMutation();
  const [pivotRallyCry, { isLoading: pivoting }] = useDeleteRallyCryMutation();
  const [renameRallyCry] = useRenameRallyCryMutation();
  const [renameObjective] = useRenameDefiningObjectiveMutation();
  const [renameOutcome] = useRenameOutcomeMutation();

  // Outcome add/remove
  const [removeOutcome, setRemoveOutcome] = useState<OutcomeRefDto | null>(null);
  const [addingOutcomeDoId, setAddingOutcomeDoId] = useState<number | null>(null);
  const [outcomeTitle, setOutcomeTitle] = useState("");
  // Objective add/remove
  const [removeObjective, setRemoveObjective] = useState<ObjectiveGroup | null>(null);
  const [addingObjectiveRcId, setAddingObjectiveRcId] = useState<number | null>(null);
  const [objTitle, setObjTitle] = useState("");
  const [objFirstOutcome, setObjFirstOutcome] = useState("");
  // Pivot
  const [pivotTarget, setPivotTarget] = useState<RallyCryGroup | null>(null);

  const groups = useMemo(() => {
    const end = weekEnd(week);
    const established = (data?.content ?? []).filter((o) => {
      const created = o.createdDate ? o.createdDate.slice(0, 10) <= end : true;
      const notRetired = !o.effectiveTo || o.effectiveTo.slice(0, 10) > end;
      return created && notRetired;
    });
    return groupStrategy(established);
  }, [data, week]);

  async function submitAddOutcome(definingObjectiveId: number) {
    const title = outcomeTitle.trim();
    if (!title) return;
    await createOutcome({ definingObjectiveId, title }).unwrap();
    setOutcomeTitle("");
    setAddingOutcomeDoId(null);
  }

  async function submitAddObjective(rallyCryId: number) {
    const title = objTitle.trim();
    const first = objFirstOutcome.trim();
    if (!title || !first) return;
    const created = await createObjective({ rallyCryId, title }).unwrap();
    await createOutcome({ definingObjectiveId: created.id, title: first }).unwrap();
    setObjTitle("");
    setObjFirstOutcome("");
    setAddingObjectiveRcId(null);
  }

  async function confirmRemoveOutcome() {
    if (!removeOutcome) return;
    await deleteOutcome(removeOutcome.id).unwrap();
    setRemoveOutcome(null);
  }

  async function confirmRemoveObjective() {
    if (removeObjective?.definingObjectiveId == null) return;
    await deleteObjective(removeObjective.definingObjectiveId).unwrap();
    setRemoveObjective(null);
  }

  async function confirmPivot() {
    if (pivotTarget?.rallyCryId == null) return;
    await pivotRallyCry(pivotTarget.rallyCryId).unwrap();
    setPivotTarget(null);
    navigate("../onboarding/strategy/rally-cry", { relative: "path" });
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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-neutral-600">Rally Cry</p>
                {editable && rc.rallyCryId != null ? (
                  <EditableTitle
                    value={rc.rallyCryTitle ?? "Untitled Rally Cry"}
                    onSave={(t) => renameRallyCry({ id: rc.rallyCryId!, title: t })}
                    className="mt-0.5 text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
                    cy={`rename-rally-cry-${rc.rallyCryId}`}
                  />
                ) : (
                  <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    {rc.rallyCryTitle ?? "Untitled Rally Cry"}
                  </h2>
                )}
              </div>
              {editable && rc.rallyCryId != null ? (
                <button
                  type="button"
                  onClick={() => setPivotTarget(rc)}
                  data-cy="pivot-rally-cry"
                  className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded px-1.5 py-1"
                >
                  <HiOutlineSwitchHorizontal className="h-3.5 w-3.5" aria-hidden /> Pivot
                </button>
              ) : null}
            </div>

            {rc.objectives.map((dobj) => (
              <div
                key={dobj.definingObjectiveId ?? dobj.definingObjectiveTitle ?? "do"}
                className="border-l-2 border-neutral-200 dark:border-neutral-800 pl-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  {editable && dobj.definingObjectiveId != null ? (
                    <EditableTitle
                      value={dobj.definingObjectiveTitle ?? "Untitled Objective"}
                      onSave={(t) => renameObjective({ id: dobj.definingObjectiveId!, title: t })}
                      className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
                      cy={`rename-objective-${dobj.definingObjectiveId}`}
                    />
                  ) : (
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {dobj.definingObjectiveTitle ?? "Untitled Objective"}
                    </p>
                  )}
                  {editable && dobj.definingObjectiveId != null ? (
                    <button
                      type="button"
                      onClick={() => setRemoveObjective(dobj)}
                      aria-label={`Remove objective ${dobj.definingObjectiveTitle ?? ""}`}
                      data-cy={`remove-objective-${dobj.definingObjectiveId}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <HiX className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  ) : null}
                </div>
                <ul className="space-y-1.5">
                  {dobj.outcomes.map((o) => (
                    <li key={o.id} className="flex items-center gap-2 text-sm">
                      <Badge tone={priorityTone(o.priorityTier)} size="xs">
                        {o.priorityTier}
                      </Badge>
                      {editable ? (
                        <EditableTitle
                          value={o.title}
                          onSave={(t) => renameOutcome({ id: o.id, title: t })}
                          className="text-neutral-900 dark:text-neutral-50"
                          cy={`rename-outcome-${o.id}`}
                        />
                      ) : (
                        <span className="text-neutral-900 dark:text-neutral-50">{o.title}</span>
                      )}
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => setRemoveOutcome(o)}
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
                  <InlineAdd
                    open={addingOutcomeDoId === dobj.definingObjectiveId}
                    busy={creatingOutcome}
                    cy="add-outcome"
                    label="Add outcome"
                    placeholder="New outcome…"
                    value={outcomeTitle}
                    onOpen={() => {
                      setAddingOutcomeDoId(dobj.definingObjectiveId);
                      setOutcomeTitle("");
                    }}
                    onChange={setOutcomeTitle}
                    onCancel={() => setAddingOutcomeDoId(null)}
                    onSubmit={() => submitAddOutcome(dobj.definingObjectiveId!)}
                  />
                ) : null}
              </div>
            ))}

            {editable && rc.rallyCryId != null ? (
              <AddObjective
                open={addingObjectiveRcId === rc.rallyCryId}
                busy={creatingObjective}
                title={objTitle}
                outcome={objFirstOutcome}
                onOpen={() => {
                  setAddingObjectiveRcId(rc.rallyCryId);
                  setObjTitle("");
                  setObjFirstOutcome("");
                }}
                onTitle={setObjTitle}
                onOutcome={setObjFirstOutcome}
                onCancel={() => setAddingObjectiveRcId(null)}
                onSubmit={() => submitAddObjective(rc.rallyCryId!)}
              />
            ) : null}
          </div>
        </Card>
      ))}

      <ConfirmDialog
        open={removeOutcome != null}
        title={removeOutcome ? `Remove "${removeOutcome.title}"?` : ""}
        body={
          <p>
            It stops showing from this week forward. Past weeks keep it, so history stays intact.
          </p>
        }
        confirmLabel={deletingOutcome ? "Removing…" : "Remove outcome"}
        destructive
        onCancel={() => setRemoveOutcome(null)}
        onConfirm={confirmRemoveOutcome}
      />
      <ConfirmDialog
        open={removeObjective != null}
        title={
          removeObjective
            ? `Remove "${removeObjective.definingObjectiveTitle ?? "objective"}"?`
            : ""
        }
        body={
          <p>
            This retires the objective and its outcomes from this week forward. Past weeks keep
            them.
          </p>
        }
        confirmLabel={deletingObjective ? "Removing…" : "Remove objective"}
        destructive
        onCancel={() => setRemoveObjective(null)}
        onConfirm={confirmRemoveObjective}
      />
      <ConfirmDialog
        open={pivotTarget != null}
        title={pivotTarget ? `Pivot away from "${pivotTarget.rallyCryTitle ?? "Rally Cry"}"?` : ""}
        body={
          <p>
            This retires the current Rally Cry and its objectives + outcomes, then takes you to set
            up a new one. Past weeks keep the old strategy.
          </p>
        }
        confirmLabel={pivoting ? "Pivoting…" : "Pivot Rally Cry"}
        destructive
        onCancel={() => setPivotTarget(null)}
        onConfirm={confirmPivot}
      />
    </div>
  );
}

/** Inline "+ Label" that expands to a single text input + Add/Cancel. */
function InlineAdd({
  open,
  busy,
  cy,
  label,
  placeholder,
  value,
  onOpen,
  onChange,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  cy: string;
  label: string;
  placeholder: string;
  value: string;
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
        data-cy={cy}
        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded"
      >
        <HiPlus className="h-3.5 w-3.5" aria-hidden /> {label}
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-cy={`${cy}-input`}
        className="flex-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
      />
      <Button type="submit" size="sm" disabled={busy || !value.trim()} data-cy={`${cy}-save`}>
        {busy ? "Adding…" : "Add"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}

/**
 * Click-to-rename title. In-place: committing PUTs the new title, so it shows in
 * every week (the row's structure + effective range are unchanged). Enter or
 * blur saves; Escape cancels. Only rendered in the current-week editor.
 */
function EditableTitle({
  value,
  onSave,
  className,
  cy,
}: {
  value: string;
  onSave: (title: string) => void;
  className: string;
  cy: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const t = draft.trim();
    setEditing(false);
    if (t && t !== value) onSave(t);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        title="Rename"
        data-cy={cy}
        className={cn(
          className,
          "text-left rounded hover:underline decoration-dotted underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
        )}
      >
        {value}
      </button>
    );
  }
  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          setEditing(false);
        }
      }}
      data-cy={`${cy}-input`}
      className={cn(
        className,
        "rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-1.5 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
      )}
    />
  );
}

/** Inline "+ Add objective" that expands to objective title + its first outcome. */
function AddObjective({
  open,
  busy,
  title,
  outcome,
  onOpen,
  onTitle,
  onOutcome,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  title: string;
  outcome: string;
  onOpen: () => void;
  onTitle: (v: string) => void;
  onOutcome: (v: string) => void;
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
        data-cy="add-objective"
        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded"
      >
        <HiPlus className="h-3.5 w-3.5" aria-hidden /> Add objective
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-2 border-l-2 border-dashed border-neutral-200 dark:border-neutral-800 pl-4"
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="New objective…"
        data-cy="add-objective-title"
        className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
      />
      <input
        value={outcome}
        onChange={(e) => onOutcome(e.target.value)}
        placeholder="First outcome for it…"
        data-cy="add-objective-outcome"
        className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
      />
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={busy || !title.trim() || !outcome.trim()}
          data-cy="add-objective-save"
        >
          {busy ? "Adding…" : "Add objective"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
