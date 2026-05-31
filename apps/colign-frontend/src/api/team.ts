import { colignApi } from "./baseApi";
import { meApi, type MeDto } from "./me";
import type { SpringPage, TeamMemberDto } from "./types";

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export const teamApi = colignApi.injectEndpoints({
  endpoints: (build) => ({
    /** Manager roll-up: the caller's direct reports + each report's latest plan. */
    getTeam: build.query<
      SpringPage<TeamMemberDto>,
      { page?: number; size?: number; sort?: string }
    >({
      query: ({ page = 0, size = 25, sort = "displayName,asc" }) =>
        `manager/team?page=${page}&size=${size}&sort=${sort}`,
      providesTags: (result) =>
        result
          ? [
              ...result.content.map((m) => ({
                type: "Plan" as const,
                id: m.currentPlan?.id ?? `user-${m.userId}`,
              })),
              { type: "TeamMembers" as const, id: "LIST" },
            ]
          : [{ type: "TeamMembers" as const, id: "LIST" }],
    }),

    /**
     * Create a team and attach the caller as its lead. The response is the
     * caller's refreshed identity (MeDto). We write it straight into the getMe
     * cache on success so the onboarding gate sees the new teamId immediately —
     * navigating to the app right after won't race a background refetch and
     * bounce the user back to onboarding.
     */
    createTeam: build.mutation<MeDto, CreateTeamRequest>({
      query: (body) => ({ url: "teams", method: "POST", body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(meApi.util.upsertQueryData("getMe", undefined, data));
      },
    }),
  }),
});

export const { useGetTeamQuery, useCreateTeamMutation } = teamApi;
