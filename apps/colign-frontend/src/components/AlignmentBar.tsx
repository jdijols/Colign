import type { AlignmentSummary } from "@/api/types";
import { alignmentTier } from "@/lib/tokens";
import { cn } from "@/lib/cn";

interface AlignmentBarProps {
  alignment: AlignmentSummary;
  size?: "sm" | "md";
}

export function AlignmentBar({ alignment, size = "sm" }: AlignmentBarProps) {
  const { totalCommits, linkedToHighPriority, alignmentPct } = alignment;
  const tier = alignmentTier(alignmentPct);
  const barH = size === "md" ? "h-2" : "h-1.5";
  const barW = size === "md" ? "w-40" : "w-32";

  return (
    <div className="flex items-center gap-3" aria-label="Strategic alignment">
      <div className={cn("rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800", barH, barW)}>
        <div
          className={cn("rounded-full", barH, tier.bar)}
          style={{ width: `${Math.max(0, Math.min(100, alignmentPct))}%` }}
          role="progressbar"
          aria-valuenow={alignmentPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Alignment ${alignmentPct}%`}
        />
      </div>
      <span className={cn("text-xs font-medium tabular-nums", tier.label)}>{alignmentPct}%</span>
      <span className="text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
        {linkedToHighPriority}/{totalCommits} on P0/P1
      </span>
    </div>
  );
}
