// apps/colign-frontend/src/api/team.ts
import { colignApi } from "./baseApi";
import { meApi, type MeDto } from "./me";
import type { SpringPage, TeamMemberDto } from "./types";

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface TeamDto {
  id: number;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  leadUserId: number | null;
}

export const teamApi = colignApi.injectEndpoints({
  endpoints: (build) => ({
    /** Manager roll-up: caller's direct reports + each report's latest plan. */
    getManagerTeam: build.query<
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
              { type: "TeamPage" as const, id: "LIST" },
            ]
          : [{ type: "TeamPage" as const, id: "LIST" }],
    }),

    /** All members of the workspace (any role; not just reports). */
    getTeamMembers: build.query<
      SpringPage<TeamMemberDto>,
      { teamId: number; page?: number; size?: number }
    >({
      query: ({ teamId, page = 0, size = 50 }) =>
        `teams/${teamId}/members?page=${page}&size=${size}&sort=displayName,asc`,
      providesTags: (result, _err, { teamId }) =>
        result
          ? [
              ...result.content.map((m) => ({
                type: "TeamMembers" as const,
                id: `${teamId}:${m.userId}`,
              })),
              { type: "TeamMembers" as const, id: `${teamId}:LIST` },
            ]
          : [{ type: "TeamMembers" as const, id: `${teamId}:LIST` }],
    }),

    /** Read the team profile (used by the Team section in /settings). */
    getTeam: build.query<TeamDto, { teamId: number }>({
      query: ({ teamId }) => `teams/${teamId}`,
      providesTags: (_r, _e, { teamId }) => [{ type: "Team" as const, id: teamId }],
    }),

    updateTeam: build.mutation<TeamDto, { teamId: number; body: UpdateTeamRequest }>({
      query: ({ teamId, body }) => ({
        url: `teams/${teamId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { teamId }) => [
        { type: "Team" as const, id: teamId },
        "Me",
      ],
    }),

    removeTeamMember: build.mutation<void, { teamId: number; userId: number }>({
      query: ({ teamId, userId }) => ({
        url: `teams/${teamId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { teamId }) => [
        { type: "TeamMembers" as const, id: `${teamId}:LIST` },
        "Me",
        { type: "TeamPage" as const, id: "LIST" },
      ],
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

export const {
  useGetManagerTeamQuery,
  useGetTeamMembersQuery,
  useGetTeamQuery,
  useUpdateTeamMutation,
  useRemoveTeamMemberMutation,
  useCreateTeamMutation,
} = teamApi;
