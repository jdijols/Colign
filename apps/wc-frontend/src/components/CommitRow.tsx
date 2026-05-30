import { Badge, Button } from "flowbite-react";
import { HiTrash, HiOutlineFlag } from "react-icons/hi";
import type { WeeklyCommitDto } from "@/api/types";

const chessColor: Record<string, string> = {
  OFFENSE: "success",
  DEFENSE: "warning",
  MAINTENANCE: "gray",
};

const priorityColor: Record<string, string> = {
  P0: "failure",
  P1: "warning",
  P2: "info",
  P3: "gray",
};

interface Props {
  commit: WeeklyCommitDto;
  canEdit: boolean;
  onDelete: () => void;
}

export function CommitRow({ commit, canEdit, onDelete }: Props) {
  return (
    <li className="flex items-start justify-between gap-4 py-3" data-cy="commit-row">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {commit.title}
          </span>
          {commit.chessTagCode ? (
            <Badge size="xs" color={chessColor[commit.chessTagCode] ?? "gray"}>
              {commit.chessTagCode}
            </Badge>
          ) : null}
          <Badge size="xs" color={priorityColor[commit.outcomePriority ?? "P3"] ?? "gray"}>
            {commit.outcomePriority ?? "—"}
          </Badge>
        </div>

        {commit.description ? (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {commit.description}
          </p>
        ) : null}

        <div className="mt-1 text-xs text-gray-500 flex items-center gap-1.5">
          <HiOutlineFlag className="h-3.5 w-3.5" aria-hidden />
          <span className="truncate">{commit.outcomeTitle ?? `Outcome #${commit.outcomeId}`}</span>
          {commit.plannedEffortHours != null ? (
            <span className="ml-2 tabular-nums">· {commit.plannedEffortHours}h planned</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge size="xs" color={statusColor(commit.status)}>{commit.status}</Badge>
        {canEdit ? (
          <Button
            size="xs"
            color="light"
            onClick={onDelete}
            aria-label={`Delete commit ${commit.title}`}
            data-cy="delete-commit"
          >
            <HiTrash className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function statusColor(s: WeeklyCommitDto["status"]): string {
  switch (s) {
    case "DONE":
      return "success";
    case "MISSED":
      return "failure";
    case "IN_PROGRESS":
      return "info";
    case "CARRIED":
      return "purple";
    case "PLANNED":
    default:
      return "gray";
  }
}
