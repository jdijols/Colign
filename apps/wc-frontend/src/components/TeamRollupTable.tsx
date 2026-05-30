import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Pagination,
} from "flowbite-react";
import { HiOutlineEye, HiArrowSmUp, HiArrowSmDown } from "react-icons/hi";
import { useGetTeamQuery } from "@/api/team";
import type { TeamMemberDto } from "@/api/types";
import { PlanStatePill } from "@/components/PlanStatePill";

type SortKey = "displayName" | "weekStartDate";
type SortDir = "asc" | "desc";

function alignmentTier(pct: number): { bar: string; label: string } {
  if (pct >= 70) return { bar: "bg-green-500", label: "text-green-700 dark:text-green-400" };
  if (pct >= 40) return { bar: "bg-amber-400", label: "text-amber-700 dark:text-amber-300" };
  return { bar: "bg-red-500", label: "text-red-700 dark:text-red-400" };
}

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
    <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <Table hoverable className="text-sm">
        <TableHead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
          <TableHeadCell
            className="py-2 cursor-pointer"
            onClick={() => toggleSort("displayName")}
            aria-sort={sort === "displayName" ? (dir === "asc" ? "ascending" : "descending") : "none"}
          >
            Direct report <SortIcon k="displayName" />
          </TableHeadCell>
          <TableHeadCell className="py-2">Week of</TableHeadCell>
          <TableHeadCell className="py-2">Status</TableHeadCell>
          <TableHeadCell className="py-2">Alignment</TableHeadCell>
          <TableHeadCell className="py-2">Commits</TableHeadCell>
          <TableHeadCell className="py-2">
            <span className="sr-only">Open</span>
          </TableHeadCell>
        </TableHead>
        <TableBody className="divide-y">
          {isFetching && !data ? (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center">
                <Spinner size="sm" aria-label="Loading team" />
              </TableCell>
            </TableRow>
          ) : (data?.content ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center text-sm text-gray-500">
                No direct reports linked to your account. (Seeded as
                manager@st6.dev → Ada / Ben / Chris in the H2 demo profile.)
              </TableCell>
            </TableRow>
          ) : (
            data?.content.map((m) => {
              const plan = m.currentPlan;
              const tier = alignmentTier(plan?.alignment.alignmentPct ?? 0);
              return (
                <TableRow
                  key={m.userId}
                  className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => onSelectMember(m)}
                  data-cy="team-row"
                >
                  <TableCell className="py-2 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <Avatar rounded size="xs" alt="" img={m.avatarUrl ?? undefined} />
                      <div className="leading-tight">
                        <div>{m.displayName}</div>
                        <div className="text-xs text-gray-500">{m.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                    {plan?.weekStartDate ?? <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell className="py-2">
                    {plan ? <PlanStatePill state={plan.state} /> : <Badge color="gray">No plan</Badge>}
                  </TableCell>
                  <TableCell className="py-2 w-48">
                    {plan ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className={`h-1.5 rounded ${tier.bar}`}
                            style={{ width: `${Math.max(0, Math.min(100, plan.alignment.alignmentPct))}%` }}
                            role="progressbar"
                            aria-valuenow={plan.alignment.alignmentPct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${m.displayName} alignment ${plan.alignment.alignmentPct}%`}
                          />
                        </div>
                        <span className={`tabular-nums text-xs font-medium ${tier.label}`}>
                          {plan.alignment.alignmentPct}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 tabular-nums text-sm">
                    {plan ? `${plan.commits.length}` : <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <Button
                      size="xs"
                      color="light"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMember(m);
                      }}
                      aria-label={`Review ${m.displayName}'s week`}
                    >
                      <HiOutlineEye className="mr-1 h-3.5 w-3.5" /> Review
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          Showing <span className="font-medium">{from}</span>–
          <span className="font-medium">{to}</span> of{" "}
          <span className="font-medium">{data?.totalElements ?? 0}</span>
        </span>
        <Pagination
          currentPage={page + 1}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p - 1)}
          showIcons
          previousLabel="Prev"
          nextLabel="Next"
        />
      </div>
    </div>
  );
}
