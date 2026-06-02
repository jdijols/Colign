import { colignApi } from "./baseApi";
import type { OutcomeRefDto } from "./types";

// Mirrors apps/colign-backend src/main/java/com/colign/dto/{RallyCryDto,DefiningObjectiveDto}.

export interface RallyCryDto {
  id: number;
  title: string;
  narrative: string | null;
  teamId: number;
  horizonStart: string; // ISO yyyy-mm-dd
  horizonEnd: string;
  status: string;
}

export interface DefiningObjectiveDto {
  id: number;
  rallyCryId: number;
  teamId: number;
  title: string;
  description: string | null;
  status: string;
}

export interface CreateRallyCryRequest {
  title: string;
  narrative?: string;
}

export interface CreateDefiningObjectiveRequest {
  rallyCryId: number;
  title: string;
  description?: string;
}

export interface CreateOutcomeRequest {
  definingObjectiveId: number;
  title: string;
  description?: string;
  priorityTier?: string;
}

/**
 * Strategy authoring (Rally Cry → Defining Objective → Outcome) used by the
 * onboarding wizard. Writes are team-scoped + authority-gated server-side
 * (MANAGER/ADMIN or the team lead); the wizard is only ever shown to callers who
 * pass that bar. Creating the leaf Outcome flips `strategySetupComplete`, so that
 * mutation invalidates "Me" to re-route the gate.
 */
export const strategyApi = colignApi.injectEndpoints({
  endpoints: (build) => ({
    createRallyCry: build.mutation<RallyCryDto, CreateRallyCryRequest>({
      query: (body) => ({ url: "rally-cries", method: "POST", body }),
    }),
    createDefiningObjective: build.mutation<DefiningObjectiveDto, CreateDefiningObjectiveRequest>({
      query: (body) => ({ url: "defining-objectives", method: "POST", body }),
    }),
    createOutcome: build.mutation<OutcomeRefDto, CreateOutcomeRequest>({
      query: (body) => ({ url: "outcomes", method: "POST", body }),
      invalidatesTags: ["Me", "Outcome"],
    }),
    /** Soft-delete (retire) an Outcome. Invalidates Me too: removing the last active Outcome flips strategySetupComplete. */
    deleteOutcome: build.mutation<void, number>({
      query: (id) => ({ url: `outcomes/${id}`, method: "DELETE" }),
      invalidatesTags: ["Me", "Outcome"],
    }),
    /** Soft-delete (retire) an Objective; the backend cascades to its active outcomes. */
    deleteDefiningObjective: build.mutation<void, number>({
      query: (id) => ({ url: `defining-objectives/${id}`, method: "DELETE" }),
      invalidatesTags: ["Me", "Outcome"],
    }),
    /** Pivot: soft-delete (retire) a Rally Cry; the backend cascades to its objectives + outcomes. */
    deleteRallyCry: build.mutation<void, number>({
      query: (id) => ({ url: `rally-cries/${id}`, method: "DELETE" }),
      invalidatesTags: ["Me", "Outcome"],
    }),
    // In-place rename: the PUT endpoints edit the row, so the new title shows in
    // every week (past weeks keep the structure + effective range, just the
    // updated label). Invalidate Outcome — the outcomes list carries the
    // denormalized RC/DO/Outcome titles the timeline renders.
    renameRallyCry: build.mutation<RallyCryDto, { id: number; title: string }>({
      query: ({ id, title }) => ({ url: `rally-cries/${id}`, method: "PUT", body: { title } }),
      invalidatesTags: ["Outcome"],
    }),
    renameDefiningObjective: build.mutation<DefiningObjectiveDto, { id: number; title: string }>({
      query: ({ id, title }) => ({
        url: `defining-objectives/${id}`,
        method: "PUT",
        body: { title },
      }),
      invalidatesTags: ["Outcome"],
    }),
    renameOutcome: build.mutation<OutcomeRefDto, { id: number; title: string }>({
      query: ({ id, title }) => ({ url: `outcomes/${id}`, method: "PUT", body: { title } }),
      invalidatesTags: ["Outcome"],
    }),
  }),
});

export const {
  useCreateRallyCryMutation,
  useCreateDefiningObjectiveMutation,
  useCreateOutcomeMutation,
  useDeleteOutcomeMutation,
  useDeleteDefiningObjectiveMutation,
  useDeleteRallyCryMutation,
  useRenameRallyCryMutation,
  useRenameDefiningObjectiveMutation,
  useRenameOutcomeMutation,
} = strategyApi;
