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
  }),
});

export const {
  useCreateRallyCryMutation,
  useCreateDefiningObjectiveMutation,
  useCreateOutcomeMutation,
} = strategyApi;
