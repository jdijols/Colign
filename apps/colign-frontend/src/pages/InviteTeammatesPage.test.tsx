import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockQueryResult, renderWithRouter } from "@/test/render";

// Hoisted mocks: vi.mock factories run BEFORE the module imports below, so
// any state they reference must be created inside vi.hoisted.
const hoisted = vi.hoisted(() => {
    return {
        getMe: vi.fn(),
        listInvitations: vi.fn(),
        createInvitation: vi.fn(),
        createMutationFn: vi.fn(),
        navigate: vi.fn(),
    };
});

vi.mock("@/api/me", () => ({
    useGetMeQuery: () => hoisted.getMe(),
}));

vi.mock("@/api/invites", () => ({
    useListInvitationsQuery: (...args: unknown[]) => hoisted.listInvitations(...args),
    useCreateInvitationMutation: () => [hoisted.createMutationFn, { isLoading: false }],
}));

vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
    return {
        ...actual,
        useNavigate: () => hoisted.navigate,
        Navigate: ({ to }: { to: string }) => <span data-testid="redirect">{to}</span>,
    };
});

vi.mock("@/components/Brand", () => ({
    ColignBrand: () => <span>colign</span>,
}));

import { InviteTeammatesPage } from "./InviteTeammatesPage";

const ME_WITH_TEAM = {
    id: 1,
    email: "lead@example.com",
    displayName: "Lead",
    role: "IC" as const,
    teamId: 42,
    managerId: null,
    needsInvite: true,
};

describe("InviteTeammatesPage", () => {
    beforeEach(() => {
        hoisted.getMe.mockReturnValue(mockQueryResult(ME_WITH_TEAM));
        hoisted.listInvitations.mockReturnValue(mockQueryResult([]));
        hoisted.createMutationFn.mockReturnValue({
            unwrap: () => Promise.resolve({ id: 1, token: "tok-123" }),
        });
    });
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("disables Send invite until the email parses", async () => {
        renderWithRouter(<InviteTeammatesPage />);
        const submit = screen.getByRole("button", { name: /send invite/i });
        expect(submit).toBeDisabled();

        const input = screen.getByPlaceholderText(/teammate@company\.com/i);
        await userEvent.type(input, "not-an-email");
        expect(submit).toBeDisabled();

        await userEvent.type(input, "@example.com");
        expect(submit).toBeEnabled();
    });

    it("offers Skip for now (optional invite) when no invitations have been sent", () => {
        renderWithRouter(<InviteTeammatesPage />);
        expect(screen.getByRole("button", { name: /skip for now/i })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /^done/i })).not.toBeInTheDocument();
    });

    it("keeps Send invite disabled until a valid email, independent of Skip", async () => {
        renderWithRouter(<InviteTeammatesPage />);
        // Skip is always available; Send is gated on a valid email.
        expect(screen.getByRole("button", { name: /skip for now/i })).toBeEnabled();
        expect(screen.getByRole("button", { name: /send invite/i })).toBeDisabled();
        await userEvent.type(
            screen.getByPlaceholderText(/teammate@company\.com/i),
            "teammate@example.com",
        );
        expect(screen.getByRole("button", { name: /send invite/i })).toBeEnabled();
    });

    it("replaces Skip with Done after the first invitation lands in the list", () => {
        hoisted.listInvitations.mockReturnValue(
            mockQueryResult([
                {
                    id: 7,
                    email: "ic@example.com",
                    teamId: 42,
                    inviterDisplayName: "Lead",
                    relationship: "REPORT" as const,
                    status: "PENDING" as const,
                    token: "tok-7",
                    acceptUrl: "http://localhost/invite/tok-7",
                    expiresAt: "2026-06-14T00:00:00Z",
                    acceptedAt: null,
                    createdAt: "2026-05-31T00:00:00Z",
                },
            ]),
        );
        renderWithRouter(<InviteTeammatesPage />);

        expect(screen.queryByRole("button", { name: /skip for now/i })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^done/i })).toBeInTheDocument();
        expect(screen.getByText("ic@example.com")).toBeInTheDocument();
    });

    it("submits createInvitation with the typed email and chosen relationship", async () => {
        renderWithRouter(<InviteTeammatesPage />);
        const input = screen.getByPlaceholderText(/teammate@company\.com/i);
        await userEvent.type(input, "newhire@example.com");

        // Default relationship is REPORT — but flip to PEER to prove the chip
        // state actually feeds the mutation arg.
        await userEvent.click(screen.getByRole("button", { name: /as a peer/i }));

        await userEvent.click(screen.getByRole("button", { name: /send invite/i }));

        expect(hoisted.createMutationFn).toHaveBeenCalledWith({
            teamId: 42,
            body: { email: "newhire@example.com", relationship: "PEER" },
        });
    });

    it("redirects when /me has no teamId (defense-in-depth — should not normally reach)", () => {
        hoisted.getMe.mockReturnValue(
            mockQueryResult({ ...ME_WITH_TEAM, teamId: null }),
        );
        renderWithRouter(<InviteTeammatesPage />);
        expect(screen.getByTestId("redirect")).toHaveTextContent("..");
    });

    it("renders the pending invitations list with relationship + status", () => {
        hoisted.listInvitations.mockReturnValue(
            mockQueryResult([
                {
                    id: 1,
                    email: "first@example.com",
                    teamId: 42,
                    inviterDisplayName: "Lead",
                    relationship: "REPORT" as const,
                    status: "PENDING" as const,
                    token: "a",
                    acceptUrl: "http://localhost/invite/a",
                    expiresAt: "2026-06-14T00:00:00Z",
                    acceptedAt: null,
                    createdAt: "2026-05-31T00:00:00Z",
                },
                {
                    id: 2,
                    email: "second@example.com",
                    teamId: 42,
                    inviterDisplayName: "Lead",
                    relationship: "PEER" as const,
                    status: "ACCEPTED" as const,
                    token: "b",
                    acceptUrl: "http://localhost/invite/b",
                    expiresAt: "2026-06-14T00:00:00Z",
                    acceptedAt: "2026-05-31T01:00:00Z",
                    createdAt: "2026-05-31T00:00:00Z",
                },
            ]),
        );
        renderWithRouter(<InviteTeammatesPage />);

        // Each invite row carries email + lowercased status + relationship
        // label. The label is split across text + <span> nodes (pending/
        // accepted/etc. is colored), so assert on the row's textContent
        // rather than chasing a single matching node.
        const rows = screen.getAllByRole("listitem");
        expect(rows).toHaveLength(2);
        expect(within(rows[0]).getByText("first@example.com")).toBeInTheDocument();
        expect(rows[0].textContent).toMatch(/report · pending/i);
        expect(rows[1].textContent).toMatch(/peer · accepted/i);
    });

    it("preserves the Send button shape with no email (smoke for disabled style)", () => {
        renderWithRouter(<InviteTeammatesPage />);
        const submit = screen.getByRole("button", { name: /send invite/i });
        // Smoke: explicitly disabled means the disabled style is applied (the
        // class swap is keyed off the same `canSend` boolean).
        expect(submit).toBeDisabled();
        // sanity: a keyboard submit doesn't fire the mutation
        fireEvent.submit(submit.closest("form")!);
        expect(hoisted.createMutationFn).not.toHaveBeenCalled();
    });
});
