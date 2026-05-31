import { useState } from "react";
import { HiOutlineEye, HiArrowSmUp, HiArrowSmDown } from "react-icons/hi";
import { useGetTeamQuery } from "@/api/team";
import type { TeamMemberDto } from "@/api/types";
import { PlanStatePill } from "@/components/PlanStatePill";
import {
  Badge,
  Button,
  Pagination,
  Spinner,
  TableScroller,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/components/ui";
import { alignmentTier } from "@/lib/tokens";
import { cn } from "@/lib/cn";

type SortKey = "displayName" | "weekStartDate";
type SortDir = "asc" | "desc";

interface Props {
  onSelectMember: (m: TeamMemberDto) => void;
}

export function TeamRollupTable({ onSelectMember }: Props) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortKey>("displayName");
  const [dir, setDir] = useState<SortDir>("asc");
  const perPage = 25;

  const { data, isFetching } = useGetTeamQuery(
    { page, size: perPage, sort: `${sort},${dir}` },
    { refetchOnMountOrArgChange: false }
  );

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(k);
      setDir("asc");
    }
    setPage(0);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k ? null : dir === "asc" ? (
      <HiArrowSmUp className="inline ml-1 h-3 w-3" aria-hidden />
    ) : (
      <HiArrowSmDown className="inline ml-1 h-3 w-3" aria-hidden />
    );

  const totalPages = data ? Math.max(1, data.totalPages) : 1;
  const from = data && data.totalElements > 0 ? page * perPage + 1 : 0;
  const to = data ? Math.min((page + 1) * perPage, data.totalElements) : 0;

  return (
    <div className="space-y-3">
      <TableScroller>
        <Table>
          <THead>
            <tr>
              <TH
                onClick={() => toggleSort("displayName")}
                aria-sort={
                  sort === "displayName" ? (dir === "asc" ? "ascending" : "descending") : "none"
                }
                className="cursor-pointer"
              >
                Direct report <SortIcon k="displayName" />
              </TH>
              <TH>Week of</TH>
              <TH>Status</TH>
              <TH>Alignment</TH>
              <TH>Commits</TH>
              <TH className="text-right">
                <span className="sr-only">Open</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {isFetching && !data ? (
              <TR hover={false}>
                <TD colSpan={6} className="py-8 text-center text-neutral-600">
                  <Spinner size="sm" /> Loading team…
                </TD>
              </TR>
            ) : (data?.content ?? []).length === 0 ? (
              <TR hover={false}>
                <TD colSpan={6} className="py-8 text-center text-sm text-neutral-600">
                  No direct reports linked to your account. (Seeded as
                  manager@st6.dev → Ada / Ben / Chris in the H2 demo profile.)
                </TD>
              </TR>
            ) : (
              data?.content.map((m) => {
                const plan = m.currentPlan;
                const tier = alignmentTier(plan?.alignment.alignmentPct ?? 0);
                return (
                  <TR
                    key={m.userId}
                    onClick={() => onSelectMember(m)}
                    className="cursor-pointer"
                    data-cy="team-row"
                  >
                    <TD className="whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">
                          {initials(m.displayName)}
                        </div>
                        <div className="leading-tight">
                          <div className="font-medium text-sm text-neutral-900 dark:text-neutral-50">
                            {m.displayName}
                          </div>
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
                      {plan?.weekStartDate ?? <span className="text-neutral-400">—</span>}
                    </TD>
                    <TD>
                      {plan ? (
                        <PlanStatePill state={plan.state} size="xs" />
                      ) : (
                        <Badge tone="neutral" size="xs">
                          No plan
                        </Badge>
                      )}
                    </TD>
                    <TD className="w-52">
                      {plan ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                            <div
                              className={cn("h-1.5 rounded-full", tier.bar)}
                              style={{
                                width: `${Math.max(0, Math.min(100, plan.alignment.alignmentPct))}%`,
                              }}
                              role="progressbar"
                              aria-valuenow={plan.alignment.alignmentPct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${m.displayName} alignment ${plan.alignment.alignmentPct}%`}
                            />
                          </div>
                          <span className={cn("text-xs font-medium tabular-nums", tier.label)}>
                            {plan.alignment.alignmentPct}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </TD>
                    <TD className="tabular-nums text-sm">
                      {plan ? plan.commits.length : <span className="text-neutral-400">—</span>}
                    </TD>
                    <TD className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMember(m);
                        }}
                        leftIcon={<HiOutlineEye className="h-3.5 w-3.5" />}
                        aria-label={`Review ${m.displayName}'s week`}
                      >
                        Review
                      </Button>
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </TableScroller>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1">
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          Showing <span className="font-medium tabular-nums">{from}</span>–
          <span className="font-medium tabular-nums">{to}</span> of{" "}
          <span className="font-medium tabular-nums">{data?.totalElements ?? 0}</span>
        </span>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
