import { useMemo } from "react";
import { HiOutlineSwitchHorizontal } from "react-icons/hi";
import type { TeamMemberDto, WeeklyCommitDto } from "@/api/types";
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

interface RcdoGroup {
  rallyCry: string;
  objectives: { objective: string; commits: WeeklyCommitDto[] }[];
}

const NO_RC = "(no Rally Cry)";
const NO_DO = "(no Defining Objective)";

/**
 * Group commits by Rally Cry → Defining Objective. Preserves first-seen order
 * so the drawer reads predictably across re-renders.
 */
function groupByRcdo(commits: WeeklyCommitDto[]): RcdoGroup[] {
  const map = new Map<string, Map<string, WeeklyCommitDto[]>>();
  commits.forEach((c) => {
    const rc = c.rallyCryTitle ?? NO_RC;
    const obj = c.definingObjectiveTitle ?? NO_DO;
    if (!map.has(rc)) map.set(rc, new Map());
    const rcMap = map.get(rc)!;
    if (!rcMap.has(obj)) rcMap.set(obj, []);
    rcMap.get(obj)!.push(c);
  });
  return Array.from(map.entries()).map(([rallyCry, objectives]) => ({
    rallyCry,
    objectives: Array.from(objectives.entries()).map(([objective, list]) => ({
      objective,
      commits: list,
    })),
  }));
}

export function IcDrillDrawer({ member, onClose }: Props) {
  const grouped = useMemo<RcdoGroup[]>(
    () => groupByRcdo(member?.currentPlan?.commits ?? []),
    [member],
  );
  return (
    <Drawer
      open={!!member}
      onClose={onClose}
      width="xl"
      closeAffordance="back"
      title={member?.displayName ?? ""}
      description={member ? `${member.email} · ${member.role}` : undefined}
    >
      {/* DESIGN.md hookup:
          - eyebrow class for the "Week of" / "Rally Cry" labels (11px,
            uppercase, tracking-wider, soft text) — replaces ad-hoc
            text-[10px] uppercase tracking-wider text-neutral-600.
          - font-display + display-sm for the week-of-date — the drawer's
            visual anchor.
          - Token-named borders/text colors (border-hairline, text-fg, etc.)
            so the drawer participates in the canvas/surface/hairline scale
            rather than reaching for raw neutral-* shades.
          - Objective group rendered with the left-rule cascade idiom
            (border-l-2 border-hairline-strong + pl-md) instead of nested
            boxes — directly implements DESIGN.md §9 locked pattern. */}
      <div className="ic-drill-drawer-content">
        {!member ? null : !member.currentPlan ? (
          <div className="rounded-r-md border border-dashed border-hairline dark:border-neutral-700 p-xl text-sm text-fg-soft text-center">
            No plan recorded yet.
          </div>
        ) : (
          <div className="space-y-lg">
            <div className="flex items-center justify-between gap-sm">
              <div>
                <p className="eyebrow">Week of</p>
                <p className="font-display text-2xl font-medium tracking-tight text-fg dark:text-neutral-50 tabular-nums mt-2xs">
                  {member.currentPlan.weekStartDate}
                </p>
              </div>
              <PlanStatePill state={member.currentPlan.state} />
            </div>

            <AlignmentBar alignment={member.currentPlan.alignment} size="md" />

            <div className="h-px bg-hairline dark:bg-neutral-800" />

            <div>
              <h3 className="eyebrow mb-sm">Commits · {member.currentPlan.commits.length}</h3>
              {member.currentPlan.commits.length === 0 ? (
                <p className="text-sm text-fg-soft">No commits in this plan.</p>
              ) : (
                <div className="space-y-lg" data-cy="rcdo-grouped-commits">
                  {grouped.map((rc) => (
                    <section key={rc.rallyCry}>
                      <p className="eyebrow mb-xs" data-cy="drill-rally-cry">
                        Rally Cry · {rc.rallyCry}
                      </p>
                      {/* Outcome / Objective groups: left-rule cascade —
                          1px solid hairline-strong on the left, 16px padding.
                          No nested boxes. */}
                      <div className="space-y-sm">
                        {rc.objectives.map((obj) => (
                          <div
                            key={`${rc.rallyCry}::${obj.objective}`}
                            className="border-l border-hairline-strong dark:border-neutral-700 pl-md"
                            data-cy="drill-objective-group"
                          >
                            <p className="text-sm font-medium text-fg dark:text-neutral-50 mb-xs">
                              {obj.objective}
                            </p>
                            <ul className="space-y-xs">
                              {obj.commits.map((c) => (
                                <li
                                  key={c.id}
                                  className="rounded-r-md border border-hairline dark:border-neutral-800 p-sm bg-surface"
                                >
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-sm text-fg dark:text-neutral-50">
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
                                        <HiOutlineSwitchHorizontal
                                          className="h-2.5 w-2.5 mr-0.5"
                                          aria-hidden
                                        />
                                        carried
                                      </Badge>
                                    ) : null}
                                    <Badge
                                      tone={commitStatusTone(c.status)}
                                      size="xs"
                                      className="ml-auto"
                                    >
                                      {commitStatusLabel(c.status)}
                                    </Badge>
                                  </div>
                                  <p className="mt-1 text-xs text-fg-soft dark:text-neutral-400">
                                    {c.outcomeTitle ?? `Outcome #${c.outcomeId}`}
                                    {c.plannedEffortHours != null
                                      ? ` · planned ${c.plannedEffortHours}h`
                                      : ""}
                                  </p>

                                  {c.reconciliation ? (
                                    <div className="mt-2 rounded-r-md bg-surface-tint dark:bg-neutral-900 p-2.5 text-xs space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          tone={reconcileStatusTone(c.reconciliation.actualStatus)}
                                          size="xs"
                                        >
                                          {c.reconciliation.actualStatus}
                                        </Badge>
                                        {c.reconciliation.actualEffortHours != null ? (
                                          <span className="text-fg-soft dark:text-neutral-400 tabular-nums">
                                            {c.reconciliation.actualEffortHours}h actual
                                          </span>
                                        ) : null}
                                      </div>
                                      {c.reconciliation.actualOutcomeNote ? (
                                        <p className="text-fg-soft dark:text-neutral-400 italic">
                                          “{c.reconciliation.actualOutcomeNote}”
                                        </p>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-r-md border border-dashed border-hairline dark:border-neutral-700 p-sm text-xs text-fg-soft dark:text-neutral-400">
              <strong className="text-fg dark:text-neutral-300 font-semibold">Coming next.</strong>{" "}
              Approve / Request changes / Comment actions. Read-only for now — managers see the full
              plan + reconciliation state at a glance.
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
