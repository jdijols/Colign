import { useState } from "react";
import { Badge, Button, Label, Textarea, TextInput, Spinner } from "flowbite-react";
import { HiCheck, HiX } from "react-icons/hi";
import type { ReconcileStatus, WeeklyCommitDto } from "@/api/types";
import { useReconcileCommitMutation } from "@/api/reconciliations";

const OPTIONS: Array<{ value: ReconcileStatus; label: string; color: string; activeColor: string }> = [
  { value: "DONE",    label: "Done",     color: "bg-green-50 text-green-800 hover:bg-green-100 dark:bg-green-950 dark:text-green-200",    activeColor: "bg-green-600 text-white" },
  { value: "PARTIAL", label: "Partial",  color: "bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200",    activeColor: "bg-amber-600 text-white" },
  { value: "MISSED",  label: "Missed",   color: "bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-950 dark:text-red-200",              activeColor: "bg-red-600 text-white" },
  { value: "DROPPED", label: "Dropped",  color: "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200",        activeColor: "bg-gray-700 text-white" },
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
          {existing ? (
            <Badge size="xs" color={existing.actualStatus === "DONE" ? "success" : existing.actualStatus === "PARTIAL" ? "warning" : "failure"}>
              {existing.actualStatus}
            </Badge>
          ) : (
            <Badge size="xs" color="gray">unreconciled</Badge>
          )}
          <span className="font-medium text-gray-900 dark:text-white truncate group-hover:underline">
            {commit.title}
          </span>
        </div>
        <div className="text-xs text-gray-500 shrink-0 hidden sm:flex gap-3">
          <span>{commit.outcomePriority ?? "—"}</span>
          {commit.plannedEffortHours != null ? <span>planned {commit.plannedEffortHours}h</span> : null}
          {existing?.actualEffortHours != null ? <span>actual {existing.actualEffortHours}h</span> : null}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 ml-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
          <div>
            <Label value="What actually happened?" />
            <div className="mt-1 flex flex-wrap gap-2" role="radiogroup">
              {OPTIONS.map((o) => {
                const active = status === o.value;
                return (
                  <button
                    type="button"
                    key={o.value}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStatus(o.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${active ? o.activeColor : o.color}`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor={`note-${commit.id}`} value="Note (optional)" />
            <Textarea
              id={`note-${commit.id}`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1"
              placeholder="What was the actual outcome / what blocked you?"
            />
          </div>

          <div className="flex items-end gap-3">
            <div>
              <Label htmlFor={`hours-${commit.id}`} value="Actual hours" />
              <TextInput
                id={`hours-${commit.id}`}
                type="number"
                min={0}
                step={0.5}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="mt-1 max-w-32"
              />
            </div>
            <Button color="light" size="sm" onClick={onToggle}>
              <HiX className="mr-1 h-4 w-4" /> Close
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={!status || submitting}
              data-cy="save-reconciliation"
            >
              {submitting ? <Spinner size="sm" /> : <HiCheck className="mr-1 h-4 w-4" />}
              {existing ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
