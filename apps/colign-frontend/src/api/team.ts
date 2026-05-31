import { colignApi } from "./baseApi";
import type { SpringPage, TeamMemberDto } from "./types";

export const teamApi = colignApi.injectEndpoints({
  endpoints: (build) => ({
    getTeam: build.query<
      SpringPage<TeamMemberDto>,
      { page?: number; size?: number; sort?: string }
    >({
      query: ({ page = 0, size = 25, sort = "displayName,asc" }) =>
        `manager/team?page=${page}&size=${size}&sort=${sort}`,
      providesTags: (result) =>
        result
          ? [
              ...result.content.map((m) => ({ type: "Plan" as const, id: m.currentPlan?.id ?? `user-${m.userId}` })),
              { type: "TeamPage" as const, id: "LIST" },
            ]
          : [{ type: "TeamPage" as const, id: "LIST" }],
    }),
  }),
});

export const { useGetTeamQuery } = teamApi;
