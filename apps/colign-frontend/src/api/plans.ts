import { colignApi } from "./baseApi";
import type { PlanDto } from "./types";

export const plansApi = colignApi.injectEndpoints({
  endpoints: (build) => ({
    getCurrentPlan: build.query<PlanDto, void>({
      query: () => "plans/current",
      providesTags: (result) =>
        result
          ? [
              { type: "Plan", id: result.id },
              { type: "Plan", id: "CURRENT" },
            ]
          : [],
    }),
    getPlan: build.query<PlanDto, number>({
      query: (id) => `plans/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Plan", id }],
    }),
    /**
     * Read-only plan for a specific week (its Monday, "YYYY-MM-DD"). Returns
     * null when the user has no plan that week (backend 204) — the Commits
     * timeline renders an empty state rather than auto-creating a plan.
     */
    getPlanByWeek: build.query<PlanDto | null, string>({
      query: (weekStart) => `plans/by-week?date=${weekStart}`,
      providesTags: (result) =>
        result ? [{ type: "Plan", id: result.id }] : [{ type: "Plan", id: "BY_WEEK" }],
    }),
    lockPlan: build.mutation<PlanDto, number>({
      query: (id) => ({ url: `plans/${id}/lock`, method: "PATCH" }),
      invalidatesTags: (result) =>
        result
          ? [
              { type: "Plan", id: result.id },
              { type: "Plan", id: "CURRENT" },
            ]
          : [],
    }),
    startReconciliation: build.mutation<PlanDto, number>({
      query: (id) => ({ url: `plans/${id}/start-reconciliation`, method: "PATCH" }),
      invalidatesTags: (result) =>
        result
          ? [
              { type: "Plan", id: result.id },
              { type: "Plan", id: "CURRENT" },
            ]
          : [],
    }),
    finalizeReconciliation: build.mutation<PlanDto, number>({
      query: (id) => ({ url: `plans/${id}/finalize-reconciliation`, method: "PATCH" }),
      invalidatesTags: (result) =>
        result
          ? [
              { type: "Plan", id: result.id },
              { type: "Plan", id: "CURRENT" },
            ]
          : [],
    }),
  }),
});

export const {
  useGetCurrentPlanQuery,
  useGetPlanQuery,
  useGetPlanByWeekQuery,
  useLockPlanMutation,
  useStartReconciliationMutation,
  useFinalizeReconciliationMutation,
} = plansApi;
