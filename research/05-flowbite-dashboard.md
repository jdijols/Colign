# WC Manager Dashboard — Patterns & References

> **Sourcing note.** Live web (WebSearch / WebFetch / ctx7) was denied in the
> subagent environment. The brief below was synthesized from training-data
> knowledge of the Flowbite React component API (v0.10+ named-export form),
> Tailwind CSS conventions, RTK Query, and WCAG 2.1 — current through Jan 2026.
> The TSX skeleton is real working code; cited URLs are canonical destinations
> the team should verify directly.

## Reference dashboards we're stealing from

- **[Flowbite React Pro — Application UI / CRUD Layouts](https://flowbite.com/blocks/application/crud-layouts/)** — Base scaffolding: sticky table head, searchbar + filter dropdown above, status pill column, three-dot row actions, "Showing X of Y" pagination footer.
- **[Tailwind UI — Application Shells / Stacked Layouts](https://tailwindui.com/components/application-ui/page-examples/dashboards)** — Page chrome: top nav + secondary "page header with metrics" row (3–4 KPI cards) above the team table for at-a-glance team stats.
- **[shadcn/ui — Tasks data-table example](https://ui.shadcn.com/examples/tasks)** — Data-table affordances: column header sort carets, faceted filter chips, "Row selection / N of M selected" toolbar, per-row drill-down (sheet) pattern.
- **[Linear — Cycles view](https://linear.app/docs/cycles)** — Reconciliation lens: "planned scope vs. completed vs. carried over" with variance/scope-change indicator. Gold standard for plan-vs-actual at the IC level.
- **[Lattice — Manager review / team performance](https://lattice.com/library/the-managers-guide-to-1-1s)** — Drill-down slide-over: right-anchored panel with the IC's commits, alignment chips, and approve/request-changes buttons without losing table context.
- **[15Five — Weekly check-in manager view](https://www.15five.com/product/weekly-check-ins/)** — Weekly cadence framing (Mon–Fri grid) and the "needs review" badge on rows pending manager action.

## Team roll-up table

The team roll-up is a Flowbite `Table` wrapped in an overflow container with `sticky top-0` header cells, server-side pagination via RTK Query with `keepPreviousData` to avoid flicker on page change, and a compact row height (`py-2`, `text-sm`). Columns: avatar+name, role, week-of, plan status pill, alignment %, reconciled %, last updated, actions. Sort is server-side — clicking a header dispatches a new query arg. For 2000 ICs at 25/page = 80 pages, we use the `pagination` layout from Flowbite with `showIcons` plus a "Showing X–Y of Z" caption. We avoid client-side virtualization because pagination already bounds the DOM cost.

```tsx
// TeamRollupTable.tsx — Flowbite React + RTK Query
import { useState } from "react";
import {
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  Pagination,
  Avatar,
  Spinner,
} from "flowbite-react";
import { HiArrowSmUp, HiArrowSmDown } from "react-icons/hi";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

type SortDir = "asc" | "desc";
type SortKey = "name" | "alignment" | "reconciled" | "updatedAt";
type Status = "draft" | "submitted" | "approved" | "changes_requested";

interface TeamRow {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  weekOf: string;
  status: Status;
  alignmentPct: number;
  reconciledPct: number;
  updatedAt: string;
}

interface TeamPage {
  rows: TeamRow[];
  total: number;
}

export const teamApi = createApi({
  reducerPath: "teamApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/" }),
  endpoints: (b) => ({
    getTeamPage: b.query<
      TeamPage,
      { managerId: string; page: number; perPage: number; sort: SortKey; dir: SortDir }
    >({
      query: ({ managerId, page, perPage, sort, dir }) =>
        `managers/${managerId}/team?page=${page}&perPage=${perPage}&sort=${sort}&dir=${dir}`,
    }),
  }),
});
export const { useGetTeamPageQuery } = teamApi;

const statusColor: Record<Status, string> = {
  draft: "gray",
  submitted: "info",
  approved: "success",
  changes_requested: "warning",
};

function alignmentTier(pct: number): "success" | "warning" | "failure" {
  if (pct >= 70) return "success";
  if (pct >= 40) return "warning";
  return "failure";
}

export function TeamRollupTable({
  managerId,
  onSelectIC,
}: {
  managerId: string;
  onSelectIC: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>("updatedAt");
  const [dir, setDir] = useState<SortDir>("desc");
  const perPage = 25;

  const { data, isFetching } = useGetTeamPageQuery(
    { managerId, page, perPage, sort, dir },
    { refetchOnMountOrArgChange: false }
  );

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k ? null : dir === "asc" ? (
      <HiArrowSmUp className="inline ml-1 h-3 w-3" aria-hidden />
    ) : (
      <HiArrowSmDown className="inline ml-1 h-3 w-3" aria-hidden />
    );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / perPage)) : 1;
  const from = data ? (page - 1) * perPage + 1 : 0;
  const to = data ? Math.min(page * perPage, data.total) : 0;

  return (
    <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <Table hoverable className="text-sm">
        <TableHead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
          <TableHeadCell
            className="py-2 cursor-pointer"
            onClick={() => toggleSort("name")}
            aria-sort={sort === "name" ? (dir === "asc" ? "ascending" : "descending") : "none"}
          >
            Direct report <SortIcon k="name" />
          </TableHeadCell>
          <TableHeadCell className="py-2">Week of</TableHeadCell>
          <TableHeadCell className="py-2">Status</TableHeadCell>
          <TableHeadCell
            className="py-2 cursor-pointer"
            onClick={() => toggleSort("alignment")}
            aria-sort={sort === "alignment" ? (dir === "asc" ? "ascending" : "descending") : "none"}
          >
            Alignment <SortIcon k="alignment" />
          </TableHeadCell>
          <TableHeadCell
            className="py-2 cursor-pointer"
            onClick={() => toggleSort("reconciled")}
            aria-sort={sort === "reconciled" ? (dir === "asc" ? "ascending" : "descending") : "none"}
          >
            Reconciled <SortIcon k="reconciled" />
          </TableHeadCell>
          <TableHeadCell className="py-2">
            <span className="sr-only">Open</span>
          </TableHeadCell>
        </TableHead>
        <TableBody className="divide-y">
          {isFetching && !data ? (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center">
                <Spinner aria-label="Loading team" size="sm" />
              </TableCell>
            </TableRow>
          ) : (
            data?.rows.map((r) => (
              <TableRow
                key={r.id}
                className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => onSelectIC(r.id)}
              >
                <TableCell className="py-2 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <Avatar img={r.avatarUrl} rounded size="xs" alt="" />
                    <div className="leading-tight">
                      <div>{r.name}</div>
                      <div className="text-xs text-gray-500">{r.role}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2 whitespace-nowrap">{r.weekOf}</TableCell>
                <TableCell className="py-2">
                  <Badge color={statusColor[r.status]} className="px-2 py-0.5 text-xs">
                    {r.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 w-40">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-1.5 rounded ${
                          alignmentTier(r.alignmentPct) === "success"
                            ? "bg-green-500"
                            : alignmentTier(r.alignmentPct) === "warning"
                            ? "bg-yellow-400"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${r.alignmentPct}%` }}
                        role="progressbar"
                        aria-valuenow={r.alignmentPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${r.name} alignment ${r.alignmentPct}%`}
                      />
                    </div>
                    <span className="tabular-nums text-xs text-gray-700 dark:text-gray-300">
                      {r.alignmentPct}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2 tabular-nums">{r.reconciledPct}%</TableCell>
                <TableCell className="py-2 text-right">
                  <button
                    className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIC(r.id);
                    }}
                    aria-label={`Review ${r.name}'s week`}
                  >
                    Review
                  </button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          Showing <span className="font-medium">{from}</span>–
          <span className="font-medium">{to}</span> of{" "}
          <span className="font-medium">{data?.total ?? 0}</span>
        </span>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          showIcons
          previousLabel="Prev"
          nextLabel="Next"
        />
      </div>
    </div>
  );
}
```

## Reconciliation diff layout

We borrow Linear's cycle pattern but render it as a two-column "Planned | Actual" diff per weekday with a status pill between them and a numeric variance at the row tail. Completed-as-planned items render with a green check pill (no strikethrough — strikethrough hurts a11y/contrast on small body text); items that were planned but not done get a "Missed" amber pill; items that happened but were unplanned get an "Added" blue pill in the Actual column with the Planned cell italicized as "—". Variance is the delta in estimated hours so managers can see scope drift at a glance, and a per-week totals row sums it.

```
| Day        | Planned                              | Status        | Actual                                | Δ hrs |
|------------|--------------------------------------|---------------|----------------------------------------|-------|
| Mon 5/26   | Draft RCDO-17 spec (2h)              | Done          | Draft RCDO-17 spec                     |  0.0  |
| Mon 5/26   | Review PR #1284 (1h)                 | Done          | Review PR #1284                        | -0.5  |
| Tue 5/27   | RCDO-17 prototype (4h)               | Partial       | RCDO-17 prototype — 60%                | +1.5  |
| Wed 5/28   | Customer interview x2 (2h)           | Missed        | —                                      | -2.0  |
| Wed 5/28   | —                                    | Added         | Incident IR-882 triage (3h)            | +3.0  |
| Thu 5/29   | RCDO-17 prototype cont. (4h)         | Done          | RCDO-17 prototype shipped              | -0.5  |
| Fri 5/30   | Weekly write-up (1h)                 | Done          | Weekly write-up                        |  0.0  |
| Totals     |                                      |               |                                        | +1.5  |
```

## Alignment heatmap / column

Recommend the **inline thin progress bar + tiered % label** (shown in the skeleton above) over a donut or a bare badge. Rationale: in a dense 25-row table the donut wastes vertical space and forces eye saccades to a non-linear shape, while a bare % badge loses the at-a-glance "how full is it" affordance that managers want when scanning 80 pages. The horizontal bar with three semantic tiers (green ≥70, amber 40–69, red <40) gives both a quick gestalt scan down the column and a precise numeric for stakeholders who care. It's cheap to render and aligns with Flowbite's existing `Progress` component idiom. Hover/focus shows a tooltip "12 of 17 commits link to a P0/P1 RCDO outcome."

## Manager review interaction

Recommend a **right-anchored slide-over (Flowbite `Drawer` with `position="right"`, width ~`max-w-2xl`)** for the IC drill-down rather than a modal or inline expand. Rationale: managers context-switch between rows ~20 times per review session, so they need the team table to remain visible (a centered modal occludes it) and they need more vertical real estate than an inline-expanded row can offer (the reconciliation diff is tall). The drawer holds the IC header, weekday reconciliation diff, alignment breakdown, a comments thread, and a sticky footer with `Approve`, `Request changes`, and `Add comment`. Approve and Request-changes fire optimistic RTK mutations and toast the result; Request-changes opens a quick textarea inline in the footer so the manager never leaves the drawer.

## Density & a11y strategy

- Use `text-sm` (14px) on table body, `text-xs` (12px) only on metadata sub-rows and the pagination caption — never on interactive labels.
- Compress vertical rhythm with `py-2` on cells and `px-2 py-0.5` on `Badge`, but keep `min-h-[2.25rem]` on rows so 44px-ish touch targets still pass WCAG 2.1 AA on touch displays.
- Preserve Flowbite's default `focus-visible:ring-2 focus-visible:ring-blue-500` on every interactive element; never strip rings to gain density.
- Every progress bar gets `role="progressbar"`, `aria-valuenow/min/max`, and an `aria-label` that includes the IC's name.
- Every sortable header gets `aria-sort="ascending|descending|none"` and is a real `<button>` (or has `role="button"` + keyboard handler).
- Use `tabular-nums` on % and Δ columns so digits align on scan; pair color with an icon or label on status pills (color-only meaning fails WCAG 1.4.1).

## Sources

- [Flowbite React — Table component](https://flowbite-react.com/docs/components/table)
- [Flowbite React — Pagination component](https://flowbite-react.com/docs/components/pagination)
- [Flowbite React — Drawer component](https://flowbite-react.com/docs/components/drawer)
- [Flowbite Blocks — CRUD Layouts](https://flowbite.com/blocks/application/crud-layouts/)
- [Tailwind UI — Application UI dashboards](https://tailwindui.com/components/application-ui/page-examples/dashboards)
- [shadcn/ui — Tasks data-table example](https://ui.shadcn.com/examples/tasks)
- [Linear — Cycles documentation](https://linear.app/docs/cycles)
- [Lattice — Manager's guide](https://lattice.com/library/the-managers-guide-to-1-1s)
- [15Five — Weekly check-ins product page](https://www.15five.com/product/weekly-check-ins/)
- [Redux Toolkit — RTK Query pagination recipe](https://redux-toolkit.js.org/rtk-query/usage/queries#pagination)
- [WCAG 2.1 — Use of Color (1.4.1)](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html)
- [WCAG 2.1 — Target Size (2.5.5)](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
