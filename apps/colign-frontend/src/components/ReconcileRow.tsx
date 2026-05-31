import { useState } from "react";
import { HiCheck, HiChevronDown, HiChevronRight, HiX } from "react-icons/hi";
import { useReconcileCommitMutation } from "@/api/reconciliations";
import type { ReconcileStatus, WeeklyCommitDto } from "@/api/types";
import { Badge, Button, Field, Input, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { radioGroupKeyDown, radioTabIndex } from "@/lib/radioGroup";
import { reconcileStatusTone } from "@/lib/tokens";

const OPTIONS: Array<{ value: ReconcileStatus; label: string; activeClass: string; inactiveClass: string }> = [
  {
    value: "DONE",
    label: "Done",
    activeClass: "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500",
    inactiveClass:
      "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70",
  },
  {
    value: "PARTIAL",
    label: "Partial",
    activeClass: "bg-amber-500 text-neutral-900 border-amber-600",
    inactiveClass:
      "border-amber-400 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/40 dark:hover:bg-amber-950/70",
  },
  {
    value: "MISSED",
    label: "Missed",
    activeClass: "bg-rose-600 text-white border-rose-600 dark:bg-rose-500 dark:border-rose-500",
    inactiveClass:
      "border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:bg-rose-950/40 dark:hover:bg-rose-950/70",
  },
  {
    value: "DROPPED",
    label: "Dropped",
    activeClass: "bg-neutral-700 text-white border-neutral-700 dark:bg-neutral-300 dark:text-neutral-900 dark:border-neutral-300",
    inactiveClass:
      "border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:bg-neutral-900 dark:hover:bg-neutral-800",
  },
];

interface Props {
  commit: WeeklyCommitDto;
  expanded: boolean;
  onToggle: () => void;
}

export function ReconcileRow({ commit, expanded, onToggle }: Props) {
  const [submit, { isLoading: submitting }] = useReconcileCommitMutation();
  const existing = commit.reconciliation;
  const [status, setStatus] = useState<ReconcileStatus | "">(existing?.actualStatus ?? "");
  const [note, setNote] = useState<string>(existing?.actualOutcomeNote ?? "");
  const [hours, setHours] = useState<string>(existing?.actualEffortHours?.toString() ?? "");

  async function save() {
    if (!status) return;
    await submit({
      commitId: commit.id,
      body: {
        actualStatus: status as ReconcileStatus,
        actualOutcomeNote: note.trim() || undefined,
        actualEffortHours: hours ? Number(hours) : undefined,
      },
    });
  }

  return (
    <li className="py-3" data-cy="reconcile-row">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center justify-between gap-3 group"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <HiChevronDown className="h-3.5 w-3.5 text-neutral-400 shrink-0" aria-hidden />
          ) : (
            <HiChevronRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" aria-hidden />
          )}
          {existing ? (
            <Badge tone={reconcileStatusTone(existing.actualStatus)} size="xs">
              {existing.actualStatus}
            </Badge>
          ) : (
            <Badge tone="neutral" size="xs" variant="outline">
              unreconciled
            </Badge>
          )}
          <span className="font-medium text-sm text-neutral-900 dark:text-neutral-50 truncate group-hover:underline">
            {commit.title}
          </span>
        </div>
        <div className="text-xs text-neutral-600 shrink-0 hidden sm:flex gap-3 items-center">
          <span>{commit.outcomePriority ?? "—"}</span>
          {commit.plannedEffortHours != null ? (
            <span className="tabular-nums">planned {commit.plannedEffortHours}h</span>
          ) : null}
          {existing?.actualEffortHours != null ? (
            <span className="tabular-nums">actual {existing.actualEffortHours}h</span>
          ) : null}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 ml-5 pl-4 border-l-2 border-neutral-200 dark:border-neutral-800 space-y-3">
          <Field label="What actually happened?">
            <div
              className="flex flex-wrap gap-1.5"
              role="radiogroup"
              aria-label="What actually happened?"
            >
              {(() => {
                const currentIdx = OPTIONS.findIndex((o) => o.value === status);
                const onKeyDown = radioGroupKeyDown(OPTIONS, currentIdx, (next) =>
                  setStatus(next.value),
                );
                return OPTIONS.map((o, idx) => {
                  const active = status === o.value;
                  return (
                    <button
                      type="button"
                      key={o.value}
                      role="radio"
                      aria-checked={active}
                      tabIndex={radioTabIndex(active, currentIdx < 0 && idx === 0)}
                      onClick={() => setStatus(o.value)}
                      onKeyDown={onKeyDown}
                      className={cn(
                        "inline-flex items-center rounded-md border text-xs font-medium px-2.5 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-1",
                        active ? o.activeClass : o.inactiveClass
                      )}
                    >
                      {o.label}
                    </button>
                  );
                });
              })()}
            </div>
          </Field>

          <Field label="Note" htmlFor={`note-${commit.id}`} hint="optional">
            <Textarea
              id={`note-${commit.id}`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was the actual outcome / what blocked you?"
            />
          </Field>

          <div className="flex items-end gap-3">
            <Field label="Actual hours" htmlFor={`hours-${commit.id}`} className="w-32">
              <Input
                id={`hours-${commit.id}`}
                type="number"
                min={0}
                step={0.5}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="tabular-nums"
              />
            </Field>
            <div className="flex-1" />
            <Button variant="secondary" size="sm" onClick={onToggle} leftIcon={<HiX className="h-3 w-3" />}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={!status || submitting}
              data-cy="save-reconciliation"
              leftIcon={submitting ? <Spinner size="sm" /> : <HiCheck className="h-3 w-3" />}
            >
              {existing ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
