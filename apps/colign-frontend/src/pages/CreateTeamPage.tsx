import { useNavigate } from "react-router-dom";
import { ColignBrand } from "@/components/Brand";

/**
 * STUB for Step 1 — fleshed out in Step 2 (POST /teams + Resend invites).
 * Exists now so the onboarding routing compiles and the choice → create
 * navigation is testable end to end.
 */
export function CreateTeamPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="lg" />
        </div>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Create a team
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Coming in the next step.
        </p>
        <button
          type="button"
          onClick={() => navigate("../onboarding")}
          className="mt-6 text-sm text-neutral-600 dark:text-neutral-400 underline underline-offset-4 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
