import { HiOutlineSwitchHorizontal } from "react-icons/hi";
import type { TeamMemberDto } from "@/api/types";
import { Badge, Drawer } from "@/components/ui";
import { PlanStatePill } from "@/components/PlanStatePill";
import { AlignmentBar } from "@/components/AlignmentBar";
import {
  chessTagTone,
  commitStatusLabel,
  commitStatusTone,
  priorityTone,
  reconcileStatusTone,
} from "@/lib/tokens";

interface Props {
  member: TeamMemberDto | null;
  onClose: () => void;
}

export function IcDrillDrawer({ member, onClose }: Props) {
  return (
    <Drawer
      open={!!member}
      onClose={onClose}
      width="xl"
      closeAffordance="back"
      title={member?.displayName ?? ""}
      description={member ? `${member.email} · ${member.role}` : undefined}
    >
      <div className="ic-drill-drawer-content">
        {!member ? null : !member.currentPlan ? (
          <div className="rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-sm text-neutral-600 text-center">
            No plan recorded yet.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-600">Week of</p>
                <p className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 tabular-nums">
                  {member.currentPlan.weekStartDate}
                </p>
              </div>
              <PlanStatePill state={member.currentPlan.state} />
            </div>

            <AlignmentBar alignment={member.currentPlan.alignment} size="md" />

            <div className="h-px bg-neutral-200 dark:bg-neutral-800" />

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-3">
                Commits · {member.currentPlan.commits.length}
              </h3>
              {member.currentPlan.commits.length === 0 ? (
                <p className="text-sm text-neutral-600">No commits in this plan.</p>
              ) : (
                <ul className="ic-drill-commit-list space-y-3">
                  {member.currentPlan.commits.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm text-neutral-900 dark:text-neutral-50">
                          {c.title}
                        </span>
                        <Badge tone={priorityTone(c.outcomePriority)} size="xs">
                          {c.outcomePriority ?? "—"}
                        </Badge>
                        {c.chessTagCode ? (
                          <Badge tone={chessTagTone(c.chessTagCode)} size="xs">
                            {c.chessTagCode}
                          </Badge>
                        ) : null}
                        {c.carriedFromCommitId != null ? (
                          <Badge tone="neutral" size="xs" variant="outline">
                            <HiOutlineSwitchHorizontal className="h-2.5 w-2.5 mr-0.5" aria-hidden />
                            carried
                          </Badge>
                        ) : null}
                        <Badge tone={commitStatusTone(c.status)} size="xs" className="ml-auto">
                          {commitStatusLabel(c.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                        {c.outcomeTitle ?? `Outcome #${c.outcomeId}`}
                        {c.plannedEffortHours != null ? ` · planned ${c.plannedEffortHours}h` : ""}
                      </p>

                      {c.reconciliation ? (
                        <div className="mt-2 rounded-md bg-neutral-50 dark:bg-neutral-900 p-2.5 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              tone={reconcileStatusTone(c.reconciliation.actualStatus)}
                              size="xs"
                            >
                              {c.reconciliation.actualStatus}
                            </Badge>
                            {c.reconciliation.actualEffortHours != null ? (
                              <span className="text-neutral-600 dark:text-neutral-400 tabular-nums">
                                {c.reconciliation.actualEffortHours}h actual
                              </span>
                            ) : null}
                          </div>
                          {c.reconciliation.actualOutcomeNote ? (
                            <p className="text-neutral-600 dark:text-neutral-400 italic">
                              “{c.reconciliation.actualOutcomeNote}”
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 p-3 text-xs text-neutral-600 dark:text-neutral-400">
              <strong className="text-neutral-700 dark:text-neutral-300 font-semibold">
                Coming next.
              </strong>{" "}
              Approve / Request changes / Comment actions. Read-only for now — managers see the full
              plan + reconciliation state at a glance.
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
