import {
  Avatar,
  Badge,
  Button,
  Drawer,
  DrawerHeader,
  DrawerItems,
  HR,
} from "flowbite-react";
import { HiX } from "react-icons/hi";
import type { TeamMemberDto } from "@/api/types";
import { PlanStatePill } from "@/components/PlanStatePill";
import { AlignmentBar } from "@/components/AlignmentBar";

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
  member: TeamMemberDto | null;
  onClose: () => void;
}

export function IcDrillDrawer({ member, onClose }: Props) {
  return (
    <Drawer open={!!member} onClose={onClose} position="right" className="!w-full sm:!w-[640px]">
      {member ? (
        <>
          <DrawerHeader title={member.displayName} titleIcon={() => <Avatar size="xs" rounded />} />
          <DrawerItems>
            <div className="space-y-4 -mt-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {member.email} · {member.role}
                </div>
                <Button size="xs" color="light" onClick={onClose}>
                  <HiX className="mr-1 h-3.5 w-3.5" /> Close
                </Button>
              </div>

              {!member.currentPlan ? (
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-sm text-gray-500 text-center">
                  No plan recorded yet.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500">
                        Week of
                      </p>
                      <p className="text-lg font-semibold">{member.currentPlan.weekStartDate}</p>
                    </div>
                    <PlanStatePill state={member.currentPlan.state} />
                  </div>

                  <AlignmentBar alignment={member.currentPlan.alignment} />

                  <HR className="my-2" />

                  <div>
                    <h3 className="text-sm font-semibold mb-2">
                      Commits ({member.currentPlan.commits.length})
                    </h3>
                    {member.currentPlan.commits.length === 0 ? (
                      <p className="text-sm text-gray-500">No commits in this plan.</p>
                    ) : (
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {member.currentPlan.commits.map((c) => (
                          <li key={c.id} className="py-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{c.title}</span>
                              {c.chessTagCode ? (
                                <Badge size="xs" color={chessColor[c.chessTagCode] ?? "gray"}>
                                  {c.chessTagCode}
                                </Badge>
                              ) : null}
                              <Badge size="xs" color={priorityColor[c.outcomePriority ?? "P3"] ?? "gray"}>
                                {c.outcomePriority ?? "—"}
                              </Badge>
                              {c.carriedFromCommitId != null ? (
                                <Badge size="xs" color="purple">carried</Badge>
                              ) : null}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {c.outcomeTitle ?? `Outcome #${c.outcomeId}`}
                              {c.plannedEffortHours != null
                                ? ` · planned ${c.plannedEffortHours}h`
                                : null}
                            </div>
                            {c.reconciliation ? (
                              <div className="mt-2 text-xs rounded bg-gray-50 dark:bg-gray-800 p-2">
                                <span className="font-semibold">{c.reconciliation.actualStatus}</span>
                                {c.reconciliation.actualEffortHours != null
                                  ? ` · ${c.reconciliation.actualEffortHours}h actual`
                                  : null}
                                {c.reconciliation.actualOutcomeNote
                                  ? <span className="block text-gray-600 dark:text-gray-300 mt-1">
                                      "{c.reconciliation.actualOutcomeNote}"
                                    </span>
                                  : null}
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <HR className="my-2" />

                  <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 text-xs text-gray-500">
                    <strong>Coming Sunday:</strong> Approve / Request changes / Comment actions.
                    For now this drawer is read-only — managers see the full plan + reconciliation
                    state at a glance.
                  </div>
                </div>
              )}
            </div>
          </DrawerItems>
        </>
      ) : null}
    </Drawer>
  );
}
