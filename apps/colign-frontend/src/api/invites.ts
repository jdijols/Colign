import { colignApi } from "./baseApi";
import { meApi, type MeDto } from "./me";

export type InvitationRelationship = "REPORT" | "PEER";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface InvitationDto {
  id: number;
  email: string;
  teamId: number;
  inviterDisplayName: string;
  relationship: InvitationRelationship;
  status: InvitationStatus;
  token: string;
  acceptUrl: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface CreateInvitationRequest {
  email: string;
  relationship: InvitationRelationship;
}

export interface InvitationPreviewDto {
  teamName: string;
  inviterDisplayName: string;
  relationship: InvitationRelationship;
  status: InvitationStatus;
}

/**
 * Team invitations — issue, list, preview (public), accept.
 *
 * The "Invites" tag is per-teamId so a getInvitations refetch after createInvite
 * is automatic and scoped (we don't blow other teams' caches in the rare
 * multi-team future). The acceptInvite mutation invalidates "Me" because the
 * accept response IS the caller's refreshed identity — same trick createTeam
 * uses: write it straight into the getMe cache so OnboardingGate sees the new
 * teamId without a refetch race.
 */
export const invitesApi = colignApi.injectEndpoints({
  endpoints: (build) => ({
    listInvitations: build.query<InvitationDto[], { teamId: number }>({
      query: ({ teamId }) => `teams/${teamId}/invitations`,
      providesTags: (_result, _error, { teamId }) => [
        { type: "Invites" as const, id: teamId },
      ],
    }),

    createInvitation: build.mutation<
      InvitationDto,
      { teamId: number; body: CreateInvitationRequest }
    >({
      query: ({ teamId, body }) => ({
        url: `teams/${teamId}/invitations`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { teamId }) => [{ type: "Invites" as const, id: teamId }],
    }),

    /**
     * Public — the invitee hasn't authenticated yet. Backend permits
     * GET /api/v1/invitations/{token} without a JWT; the response carries
     * only public-safe fields (team name, inviter display name, relationship,
     * effective status).
     */
    previewInvitation: build.query<InvitationPreviewDto, { token: string }>({
      query: ({ token }) => `invitations/${token}`,
    }),

    acceptInvitation: build.mutation<MeDto, { token: string }>({
      query: ({ token }) => ({
        url: `invitations/${token}/accept`,
        method: "POST",
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        // Same single-round-trip dance as createTeam: stuff the refreshed Me
        // straight into the cache so the next navigation sees the new teamId.
        dispatch(meApi.util.upsertQueryData("getMe", undefined, data));
      },
      invalidatesTags: ["Me"],
    }),
  }),
});

export const {
  useListInvitationsQuery,
  useCreateInvitationMutation,
  usePreviewInvitationQuery,
  useAcceptInvitationMutation,
} = invitesApi;
