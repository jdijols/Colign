import { useState } from "react";
import { HiOutlineEye, HiArrowSmUp, HiArrowSmDown } from "react-icons/hi";
import { useGetManagerTeamQuery } from "@/api/team";
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

  const { data, isFetching } = useGetManagerTeamQuery(
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
    <div
      className="space-y-3 team-rollup-container"
      style={{ containerType: "inline-size" }}
    >
      {/* Sort chip row — visible only in card mode (container < 640px) via responsive.css */}
      <div className="team-rollup-card-view-controls">
        <button
          type="button"
          onClick={() => toggleSort("displayName")}
          className={cn(
            "rounded-full px-4 py-2 text-xs font-medium border min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900",
            sort === "displayName"
              ? "bg-neutral-900 text-neutral-50 border-neutral-900 dark:bg-white dark:text-neutral-900"
              : "border-neutral-200 dark:border-neutral-800 text-neutral-600"
          )}
        >
          Name {sort === "displayName" ? (dir === "asc" ? "↑" : "↓") : ""}
        </button>
        <button
          type="button"
          onClick={() => toggleSort("weekStartDate")}
          className={cn(
            "rounded-full px-4 py-2 text-xs font-medium border min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900",
            sort === "weekStartDate"
              ? "bg-neutral-900 text-neutral-50 border-neutral-900 dark:bg-white dark:text-neutral-900"
              : "border-neutral-200 dark:border-neutral-800 text-neutral-600"
          )}
        >
          Week {sort === "weekStartDate" ? (dir === "asc" ? "↑" : "↓") : ""}
        </button>
      </div>

      {/* Table view — visible at container ≥ 640px */}
      <div className="team-rollup-table-view">
        <TableScroller>
          <Table>
          <THead>
            <tr>
              <TH
                aria-sort={
                  sort === "displayName" ? (dir === "asc" ? "ascending" : "descending") : "none"
                }
                className="p-0"
              >
                {/* Activator is a real <button> so keyboard users get native
                    Enter/Space activation and focus rings. The TH keeps
                    aria-sort for table semantics. */}
                <button
                  type="button"
                  onClick={() => toggleSort("displayName")}
                  className="w-full px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
                  aria-label={`Sort by direct report, currently ${
                    sort === "displayName"
                      ? dir === "asc"
                        ? "ascending"
                        : "descending"
                      : "unsorted"
                  }`}
                >
                  Direct report <SortIcon k="displayName" />
                </button>
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
                    data-clickable="true"
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
      </div>

      {/* Card view — visible at container < 640px */}
      <div className="team-rollup-card-view">
        {isFetching && !data ? (
          <div className="py-8 text-center text-sm text-neutral-600">
            <Spinner size="sm" /> Loading team…
          </div>
        ) : (data?.content ?? []).length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-600">
            No direct reports linked to your account.
          </div>
        ) : (
          data?.content.map((m) => (
            <TeamRollupCard key={m.userId} member={m} onSelect={onSelectMember} />
          ))
        )}
      </div>

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

function TeamRollupCard({
  member,
  onSelect,
}: {
  member: TeamMemberDto;
  onSelect: (m: TeamMemberDto) => void;
}) {
  const plan = member.currentPlan;
  const tier = alignmentTier(plan?.alignment.alignmentPct ?? 0);
  return (
    <div
      role="button"
      tabIndex={0}
      data-clickable="true"
      onClick={() => onSelect(member)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(member);
        }
      }}
      className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">
          {initials(member.displayName)}
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <div className="text-fluid-base font-medium text-neutral-900 dark:text-neutral-50 truncate">
            {member.displayName}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono truncate">
            {member.email}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {plan ? (
          <PlanStatePill state={plan.state} size="xs" />
        ) : (
          <Badge tone="neutral" size="xs">
            No plan
          </Badge>
        )}
        {plan ? (
          <span className="text-xs text-neutral-600 tabular-nums shrink-0">
            {plan.commits.length} commit{plan.commits.length === 1 ? "" : "s"}
          </span>
        ) : null}
        {plan ? (
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <div className="h-1.5 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className={cn("h-1.5 rounded-full", tier.bar)}
                style={{
                  width: `${Math.max(0, Math.min(100, plan.alignment.alignmentPct))}%`,
                }}
                role="progressbar"
                aria-valuenow={plan.alignment.alignmentPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${member.displayName} alignment ${plan.alignment.alignmentPct}%`}
              />
            </div>
            <span className={cn("text-xs font-medium tabular-nums", tier.label)}>
              {plan.alignment.alignmentPct}%
            </span>
          </div>
        ) : null}
      </div>
      <Button
        variant="secondary"
        size="lg"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(member);
        }}
        className="mt-3 w-full"
        leftIcon={<HiOutlineEye className="h-4 w-4" />}
        aria-label={`Review ${member.displayName}'s week`}
      >
        Review
      </Button>
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
