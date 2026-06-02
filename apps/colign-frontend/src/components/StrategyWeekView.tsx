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
import { Button, Spinner } from "@/components/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/cn";
import { priorityLabel } from "@/lib/tokens";
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
      <div className="py-16 text-center" data-cy="strategy-week-empty">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-400">
          Aiming for
        </p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight text-neutral-900 dark:text-neutral-50">
          No goals established yet
        </h2>
        <p className="mt-3 mx-auto max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
          Nothing was in place as of the week of {formatWeekOf(week)}. Step forward to the week your
          strategy was set.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12" data-cy="strategy-week-view">
      {groups.map((rc) => (
        // Rally Cry → first Objective gap at --s-pillar (≈48px) so the cascade reads as
        // "calm editorial" rather than a settings form (DESIGN.md §5: "Generous over
        // tight when in doubt — the brand says calm").
        <section key={rc.rallyCryId ?? rc.rallyCryTitle ?? "rc"} className="space-y-12">
          {/* Rally Cry — top-of-tree, no card boxing (DESIGN.md §9: containment from rule weights alone).
              Title leads on its own line; Pivot is a quiet ghost inline action below it (DESIGN.md §11:
              destructive-adjacent secondary action shouldn't compete with the eyebrow for first read). */}
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-400">
              Aiming for
            </p>
            {/* Font stack puts Cabinet Grotesk (DESIGN.md §3: editorial display face)
                ahead of Geist so the Rally Cry picks it up the moment foundation loads
                the Fontshare stylesheet. Falls back gracefully to Geist 500 today. */}
            {editable && rc.rallyCryId != null ? (
              <EditableTitle
                value={rc.rallyCryTitle ?? "Untitled Rally Cry"}
                onSave={(t) => renameRallyCry({ id: rc.rallyCryId!, title: t })}
                className="mt-2 font-['Cabinet_Grotesk',_Geist,_system-ui,_sans-serif] text-2xl sm:text-[1.75rem] leading-tight font-medium tracking-tight text-neutral-900 dark:text-neutral-50"
                cy={`rename-rally-cry-${rc.rallyCryId}`}
              />
            ) : (
              <h2 className="mt-2 font-['Cabinet_Grotesk',_Geist,_system-ui,_sans-serif] text-2xl sm:text-[1.75rem] leading-tight font-medium tracking-tight text-neutral-900 dark:text-neutral-50">
                {rc.rallyCryTitle ?? "Untitled Rally Cry"}
              </h2>
            )}
            {editable && rc.rallyCryId != null ? (
              <button
                type="button"
                onClick={() => setPivotTarget(rc)}
                data-cy="pivot-rally-cry"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded"
              >
                <HiOutlineSwitchHorizontal className="h-3.5 w-3.5" aria-hidden />
                <span>Pivot Rally Cry</span>
              </button>
            ) : null}
          </div>

          {/* Objectives — 2px solid --text left rule with 18px padding-left (DESIGN.md §9). */}
          <div className="space-y-8">
            {rc.objectives.map((dobj) => (
              <div
                key={dobj.definingObjectiveId ?? dobj.definingObjectiveTitle ?? "do"}
                className="border-l-2 border-neutral-900 dark:border-neutral-50 pl-[18px] space-y-4"
              >
                <div className="group flex items-center gap-2">
                  {/* Same Cabinet-Grotesk-first stack on the Objective tier so the cascade's
                      two display rows pick up the editorial face together once loaded. */}
                  {editable && dobj.definingObjectiveId != null ? (
                    <EditableTitle
                      value={dobj.definingObjectiveTitle ?? "Untitled Objective"}
                      onSave={(t) => renameObjective({ id: dobj.definingObjectiveId!, title: t })}
                      className="font-['Cabinet_Grotesk',_Geist,_system-ui,_sans-serif] text-xl leading-snug font-medium tracking-tight text-neutral-900 dark:text-neutral-50"
                      cy={`rename-objective-${dobj.definingObjectiveId}`}
                    />
                  ) : (
                    <p className="font-['Cabinet_Grotesk',_Geist,_system-ui,_sans-serif] text-xl leading-snug font-medium tracking-tight text-neutral-900 dark:text-neutral-50">
                      {dobj.definingObjectiveTitle ?? "Untitled Objective"}
                    </p>
                  )}
                  {editable && dobj.definingObjectiveId != null ? (
                    <button
                      type="button"
                      onClick={() => setRemoveObjective(dobj)}
                      aria-label={`Remove objective ${dobj.definingObjectiveTitle ?? ""}`}
                      data-cy={`remove-objective-${dobj.definingObjectiveId}`}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 inline-flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
                    >
                      <HiX className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  ) : null}
                </div>

                {/* Outcomes — 1px solid --hairline-strong left rule with 16px padding-left, nested inside the Objective rule (DESIGN.md §9).
                    Vertical rhythm: --s-md (16px) between outcomes per DESIGN.md §5 ("Generous over tight … the brand says calm"). */}
                <div className="border-l border-neutral-300 dark:border-neutral-700 pl-4 space-y-4">
                  {dobj.outcomes.map((o) => (
                    <div
                      key={o.id}
                      className="group flex items-center gap-3 text-[0.9375rem] leading-snug"
                    >
                      <PriorityIndicator tier={o.priorityTier} />
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
                          className="ml-auto opacity-0 group-hover:opacity-100 focus-visible:opacity-100 inline-flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
                        >
                          <HiX className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  ))}
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
        </section>
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

/**
 * Priority indicator primitive (DESIGN.md §11) — a 7px colored dot followed
 * by the consumer-friendly High / Medium / Low label. Not a pill: no border,
 * no background. Color carries meaning only on High/Medium; Low is muted
 * neutral so it reads quieter than High, never heavier (DESIGN.md §10 priority
 * table). API + DB keep the internal P0/P1/P2 codes; this is the UI layer.
 *
 * Dot colors are the DESIGN.md §4 tuned semantic hex values — explicitly
 * "tuned away from Tailwind defaults — quieter, less candy." Never bind to
 * rose-* / amber-* utilities here; those read enterprise/Jira, not editorial.
 *   --destructive  #c8334a  → High
 *   --warning      #c4831d  → Medium
 *   --text-faint   #a3a3a3  → Low
 */
function PriorityIndicator({ tier }: { tier: string | null | undefined }) {
  const dot =
    tier === "P0"
      ? "bg-[#c8334a]"
      : tier === "P1"
        ? "bg-[#c4831d]"
        : "bg-[#a3a3a3] dark:bg-[#737373]";
  const text =
    tier === "P0"
      ? "text-neutral-900 dark:text-neutral-50"
      : tier === "P1"
        ? "text-neutral-700 dark:text-neutral-300"
        : "text-neutral-500 dark:text-neutral-500";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap tabular-nums",
        text,
      )}
    >
      <span aria-hidden className={cn("inline-block h-[7px] w-[7px] rounded-full shrink-0", dot)} />
      {priorityLabel(tier)}
    </span>
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
        className="group inline-flex items-center gap-2 pt-1 text-xs font-medium text-neutral-500 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded"
      >
        {/* DESIGN.md §9: ghost add affordance — dashed-border circle plus, faint text. */}
        <span
          aria-hidden
          className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-dashed border-neutral-400 dark:border-neutral-600 group-hover:border-neutral-900 dark:group-hover:border-neutral-50"
        >
          <HiPlus className="h-3 w-3" aria-hidden />
        </span>
        {label}
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex items-center gap-2 pt-1"
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
        className="group inline-flex items-center gap-2 pt-2 text-xs font-medium text-neutral-500 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded"
      >
        {/* DESIGN.md §9: ghost add affordance — dashed-border circle plus, faint text. */}
        <span
          aria-hidden
          className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-dashed border-neutral-400 dark:border-neutral-600 group-hover:border-neutral-900 dark:group-hover:border-neutral-50"
        >
          <HiPlus className="h-3 w-3" aria-hidden />
        </span>
        Add objective
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-2 border-l-2 border-dashed border-neutral-300 dark:border-neutral-700 pl-[18px]"
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
