import type { PlanState } from "@/api/types";
import { Badge } from "@/components/ui";
import { planStateLabel, planStateTone, type StatusTone } from "@/lib/tokens";

interface PlanStatePillProps {
  state: PlanState;
  size?: "xs" | "sm";
}

/**
 * DESIGN.md §11 maps the user-facing "Submitted" state to a --success dot in a
 * hairline-bordered surface pill (not the high-contrast info treatment that
 * renders as a solid black pill in the SOFT palette). The underlying
 * `planStateTone` mapper still returns `info` for LOCKED to keep
 * internal-data semantics intact; the user-facing UI layer (this pill)
 * overrides to `success` so the on-screen treatment matches the spec
 * without rippling through callers that consume `planStateTone` directly.
 */
function pillTone(state: PlanState): StatusTone {
  if (state === "LOCKED") return "success";
  return planStateTone(state);
}

export function PlanStatePill({ state, size = "sm" }: PlanStatePillProps) {
  return (
    <Badge tone={pillTone(state)} size={size}>
      {planStateLabel(state)}
    </Badge>
  );
}
