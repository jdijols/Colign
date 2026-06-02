import { HiTrash, HiOutlineSwitchHorizontal } from "react-icons/hi";
import type { WeeklyCommitDto } from "@/api/types";
import { Button } from "@/components/ui";
import { commitStatusLabel, priorityDotClass, priorityLabel } from "@/lib/tokens";
import { cn } from "@/lib/cn";

interface CommitRowProps {
  commit: WeeklyCommitDto;
  canEdit: boolean;
  onDelete: () => void;
}

/**
 * Commit row in the locked left-rule cascade (DESIGN.md §9 / §11).
 *
 * Layout: 14px checkbox + title + quiet inline priority indicator. Done commits
 * show a filled --success checkbox + strikethrough title in --text-mute. The
 * outcome label and planned-hours chip live one layer deep (IcDrillDrawer);
 * keeping them on the row competes with the cascade rule that already groups
 * commits under their parent Outcome. Chess-posture is anti-pattern per §12.
 *
 * Status renders as the §11 pill ONLY when it's non-default ("In progress",
 * "Done", "Missed", "Carried") — a noisy "Planned" pill on every row is the
 * dashboard-widget tone §2 steers away from.
 */
export function CommitRow({ commit, canEdit, onDelete }: CommitRowProps) {
  const isDone = commit.status === "DONE";
  const showStatusPill = commit.status !== "PLANNED";

  return (
    <li className="group flex items-start gap-2.5 py-2.5 pr-1" data-cy="commit-row">
      {/* 14px checkbox — square hairline by default, filled --success when done.
          Visual-only here; toggling status lives in the drill drawer. */}
      <span
        className={cn(
          "mt-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
          isDone
            ? "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500"
            : "border-neutral-300 dark:border-neutral-700",
        )}
        aria-hidden
      >
        {isDone ? (
          <svg
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M2.5 6.5 L5 9 L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className={cn(
              "text-sm tracking-tight",
              isDone
                ? "text-neutral-500 line-through dark:text-neutral-500"
                : "font-medium text-neutral-900 dark:text-neutral-50",
            )}
          >
            {commit.title}
          </span>

          {/* §11 priority indicator — 7px colored dot + sentence-case label.
              No border, no background; smallest, quietest signal on the row. */}
          <span
            className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400"
            data-cy="commit-priority"
          >
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                priorityDotClass(commit.outcomePriority),
              )}
              aria-hidden
            />
            {priorityLabel(commit.outcomePriority)}
          </span>

          {commit.carriedFromCommitId != null ? (
            <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-500">
              <HiOutlineSwitchHorizontal className="h-3 w-3" aria-hidden />
              carried
            </span>
          ) : null}
        </div>

        {commit.description ? (
          <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
            {commit.description}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {showStatusPill ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                commit.status === "DONE"
                  ? "bg-emerald-600 dark:bg-emerald-500"
                  : commit.status === "IN_PROGRESS"
                    ? "bg-amber-500 dark:bg-amber-400"
                    : commit.status === "MISSED"
                      ? "bg-rose-600 dark:bg-rose-500"
                      : "bg-neutral-400 dark:bg-neutral-500",
              )}
              aria-hidden
            />
            {commitStatusLabel(commit.status)}
          </span>
        ) : null}
        {canEdit ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label={`Delete commit ${commit.title}`}
            data-cy="delete-commit"
            className="!px-0 !h-8 !w-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <HiTrash className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}
