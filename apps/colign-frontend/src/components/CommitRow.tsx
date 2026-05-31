import { HiTrash, HiOutlineFlag, HiOutlineSwitchHorizontal } from "react-icons/hi";
import type { WeeklyCommitDto } from "@/api/types";
import { Badge, Button } from "@/components/ui";
import {
  chessTagTone,
  commitStatusLabel,
  commitStatusTone,
  priorityTone,
} from "@/lib/tokens";

interface CommitRowProps {
  commit: WeeklyCommitDto;
  canEdit: boolean;
  onDelete: () => void;
}

export function CommitRow({ commit, canEdit, onDelete }: CommitRowProps) {
  return (
    <li className="flex items-start justify-between gap-4 py-3 px-1" data-cy="commit-row">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-sm text-neutral-900 dark:text-neutral-50 tracking-tight">
            {commit.title}
          </span>
          <Badge tone={priorityTone(commit.outcomePriority)} size="xs">
            {commit.outcomePriority ?? "—"}
          </Badge>
          {commit.chessTagCode ? (
            <Badge tone={chessTagTone(commit.chessTagCode)} size="xs">
              {commit.chessTagCode}
            </Badge>
          ) : null}
          {commit.carriedFromCommitId != null ? (
            <Badge tone="neutral" size="xs" variant="outline">
              <HiOutlineSwitchHorizontal className="h-2.5 w-2.5 mr-0.5" aria-hidden />
              carried
            </Badge>
          ) : null}
        </div>

        {commit.description ? (
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
            {commit.description}
          </p>
        ) : null}

        <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
          <HiOutlineFlag className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {commit.outcomeTitle ?? `Outcome #${commit.outcomeId}`}
          </span>
          {commit.plannedEffortHours != null ? (
            <>
              <span className="text-neutral-300 dark:text-neutral-700">·</span>
              <span className="tabular-nums whitespace-nowrap">
                {commit.plannedEffortHours}h planned
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge tone={commitStatusTone(commit.status)} size="xs">
          {commitStatusLabel(commit.status)}
        </Badge>
        {canEdit ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label={`Delete commit ${commit.title}`}
            data-cy="delete-commit"
            className="!px-0 !h-10 !w-10"
          >
            <HiTrash className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}
