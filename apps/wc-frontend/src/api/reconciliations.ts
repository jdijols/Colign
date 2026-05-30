import { wcApi } from "./baseApi";
import type { ReconcileCommitRequest, ReconciliationDto } from "./types";

export const reconciliationsApi = wcApi.injectEndpoints({
  endpoints: (build) => ({
    reconcileCommit: build.mutation<
      ReconciliationDto,
      { commitId: number; body: ReconcileCommitRequest }
    >({
      query: ({ commitId, body }) => ({
        url: `commits/${commitId}/reconciliation`,
        method: "POST",
        body,
      }),
      // Reconciliation lives inside the plan DTO — invalidate CURRENT.
      invalidatesTags: () => [{ type: "Plan", id: "CURRENT" }],
    }),
  }),
});

export const { useReconcileCommitMutation } = reconciliationsApi;
