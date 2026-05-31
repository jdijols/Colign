import { colignApi } from "./baseApi";
import type { AddCommitRequest, PlanDto, UpdateCommitRequest } from "./types";

export const commitsApi = colignApi.injectEndpoints({
  endpoints: (build) => ({
    addCommit: build.mutation<PlanDto, { planId: number; body: AddCommitRequest }>({
      query: ({ planId, body }) => ({
        url: `plans/${planId}/commits`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: "Plan", id: result.id }, { type: "Plan", id: "CURRENT" }] : [],
    }),
    updateCommit: build.mutation<PlanDto, { id: number; body: UpdateCommitRequest }>({
      query: ({ id, body }) => ({
        url: `commits/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: "Plan", id: result.id }, { type: "Plan", id: "CURRENT" }] : [],
    }),
    deleteCommit: build.mutation<PlanDto, number>({
      query: (id) => ({ url: `commits/${id}`, method: "DELETE" }),
      invalidatesTags: (result) =>
        result ? [{ type: "Plan", id: result.id }, { type: "Plan", id: "CURRENT" }] : [],
    }),
  }),
});

export const { useAddCommitMutation, useUpdateCommitMutation, useDeleteCommitMutation } = commitsApi;
