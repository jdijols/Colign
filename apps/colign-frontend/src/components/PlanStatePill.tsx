import type { PlanState } from "@/api/types";
import { Badge } from "@/components/ui";
import { planStateLabel, planStateTone } from "@/lib/tokens";

interface PlanStatePillProps {
  state: PlanState;
  size?: "xs" | "sm";
}

export function PlanStatePill({ state, size = "sm" }: PlanStatePillProps) {
  return (
    <Badge tone={planStateTone(state)} size={size}>
      {planStateLabel(state)}
    </Badge>
  );
}
