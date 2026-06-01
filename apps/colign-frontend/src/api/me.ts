import { colignApi } from "./baseApi";

export interface MeDto {
  id: number;
  email: string;
  displayName: string;
  role: "IC" | "MANAGER" | "ADMIN";
  teamId: number | null;
  managerId: number | null;
  /**
   * True when the caller is on a team that still needs its first invite (they're
   * the only member and no invitations have been sent). Drives the onboarding
   * gate's create→invite→app routing. Flips false the moment they invite someone
   * or anyone else joins.
   */
  needsInvite: boolean;
  teamName: string | null;
  teamAvatarUrl: string | null;
}

/**
 * "Who am I" — the frontend's routing source of truth. JIT-provisions the user
 * row server-side on first call, and returns the DERIVED role (MANAGER the
 * instant someone reports to you, no re-login). teamId === null means the user
 * has no team yet → route to onboarding.
 *
 * Tagged "Me" so mutations that change team membership or relationships
 * (create team, accept invite, add report) can invalidate it and re-route.
 */
export const meApi = colignApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<MeDto, void>({
      query: () => "me",
      providesTags: ["Me"],
    }),
  }),
});

export const { useGetMeQuery } = meApi;
