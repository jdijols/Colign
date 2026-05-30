import type { AlignmentSummary } from "@/api/types";

function tier(pct: number) {
  if (pct >= 70) return { bar: "bg-green-500", label: "text-green-700 dark:text-green-400" };
  if (pct >= 40) return { bar: "bg-amber-400", label: "text-amber-700 dark:text-amber-300" };
  return { bar: "bg-red-500", label: "text-red-700 dark:text-red-400" };
}

export function AlignmentBar({ alignment }: { alignment: AlignmentSummary }) {
  const { totalCommits, linkedToHighPriority, alignmentPct } = alignment;
  const t = tier(alignmentPct);
  return (
    <div className="flex items-center gap-3" aria-label="Strategic alignment">
      <div className="h-1.5 w-32 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-1.5 rounded ${t.bar}`}
          style={{ width: `${Math.max(0, Math.min(100, alignmentPct))}%` }}
          role="progressbar"
          aria-valuenow={alignmentPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Alignment ${alignmentPct}%`}
        />
      </div>
      <span className={`text-xs tabular-nums font-medium ${t.label}`}>
        {alignmentPct}% aligned
      </span>
      <span className="text-xs text-gray-500">
        {linkedToHighPriority}/{totalCommits} on P0/P1
      </span>
    </div>
  );
}
