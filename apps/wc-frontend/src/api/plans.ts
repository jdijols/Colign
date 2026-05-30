import { wcApi } from "./baseApi";
import type { PlanDto } from "./types";

export const plansApi = wcApi.injectEndpoints({
  endpoints: (build) => ({
    getCurrentPlan: build.query<PlanDto, void>({
      query: () => "plans/current",
      providesTags: (result) =>
        result ? [{ type: "Plan", id: result.id }, { type: "Plan", id: "CURRENT" }] : [],
    }),
    getPlan: build.query<PlanDto, number>({
      query: (id) => `plans/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Plan", id }],
    }),
    lockPlan: build.mutation<PlanDto, number>({
      query: (id) => ({ url: `plans/${id}/lock`, method: "PATCH" }),
      invalidatesTags: (result) =>
        result ? [{ type: "Plan", id: result.id }, { type: "Plan", id: "CURRENT" }] : [],
    }),
    startReconciliation: build.mutation<PlanDto, number>({
      query: (id) => ({ url: `plans/${id}/start-reconciliation`, method: "PATCH" }),
      invalidatesTags: (result) =>
        result ? [{ type: "Plan", id: result.id }, { type: "Plan", id: "CURRENT" }] : [],
    }),
    finalizeReconciliation: build.mutation<PlanDto, number>({
      query: (id) => ({ url: `plans/${id}/finalize-reconciliation`, method: "PATCH" }),
      invalidatesTags: (result) =>
        result ? [{ type: "Plan", id: result.id }, { type: "Plan", id: "CURRENT" }] : [],
    }),
  }),
});

export const {
  useGetCurrentPlanQuery,
  useGetPlanQuery,
  useLockPlanMutation,
  useStartReconciliationMutation,
  useFinalizeReconciliationMutation,
} = plansApi;
