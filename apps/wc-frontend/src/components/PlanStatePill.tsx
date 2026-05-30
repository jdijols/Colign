import { Badge } from "flowbite-react";
import type { PlanState } from "@/api/types";

const COLOR: Record<PlanState, string> = {
  DRAFT: "gray",
  LOCKED: "info",
  RECONCILING: "warning",
  RECONCILED: "success",
  CARRIED_FORWARD: "purple",
};

const LABEL: Record<PlanState, string> = {
  DRAFT: "Draft",
  LOCKED: "Locked",
  RECONCILING: "Reconciling",
  RECONCILED: "Reconciled",
  CARRIED_FORWARD: "Carried forward",
};

export function PlanStatePill({ state }: { state: PlanState }) {
  return (
    <Badge color={COLOR[state]} className="px-2.5 py-1 text-xs font-semibold tracking-wide">
      {LABEL[state]}
    </Badge>
  );
}
