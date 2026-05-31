import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    mockQueryError,
    mockQueryLoading,
    mockQueryResult,
    renderWithRouter,
} from "@/test/render";

const hoisted = vi.hoisted(() => {
    return {
        preview: vi.fn(),
        acceptMutation: vi.fn(),
        loginWithRedirect: vi.fn(),
        navigate: vi.fn(),
        authToken: null as string | null,
    };
});

vi.mock("@/api/invites", () => ({
    usePreviewInvitationQuery: (...args: unknown[]) => hoisted.preview(...args),
    useAcceptInvitationMutation: () => [hoisted.acceptMutation, { isLoading: false }],
}));

vi.mock("@auth0/auth0-react", () => ({
    useAuth0: () => ({ loginWithRedirect: hoisted.loginWithRedirect }),
}));

vi.mock("@/store/hooks", () => ({
    useAppSelector: (selector: (s: unknown) => unknown) =>
        selector({ auth: { token: hoisted.authToken } }),
}));

vi.mock("@/auth/auth0Config", () => ({
    isReal: true,
}));

vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
    return {
        ...actual,
        useNavigate: () => hoisted.navigate,
    };
});

vi.mock("@/components/Brand", () => ({
    ColignBrand: () => <span>colign</span>,
}));

import { InviteAcceptPage } from "./InviteAcceptPage";
import { Route, Routes } from "react-router-dom";

const PENDING_PREVIEW = {
    teamName: "Platform Engineering",
    inviterDisplayName: "Lead Person",
    relationship: "REPORT" as const,
    status: "PENDING" as const,
};

// Mount under a route so useParams() resolves a {token} the page can use.
function mountAtToken(token: string) {
    return renderWithRouter(
        <Routes>
            <Route path="/invite/:token" element={<InviteAcceptPage />} />
        </Routes>,
        { initialEntries: [`/invite/${token}`] },
    );
}

describe("InviteAcceptPage", () => {
    beforeEach(() => {
        hoisted.authToken = null;
        hoisted.preview.mockReturnValue(mockQueryResult(PENDING_PREVIEW));
        hoisted.acceptMutation.mockReturnValue({
            unwrap: () => Promise.resolve({ teamId: 42, role: "IC" }),
        });
    });
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("renders team + inviter + relationship for a PENDING preview", () => {
        mountAtToken("tok-pending");
        expect(screen.getByText("Platform Engineering")).toBeInTheDocument();
        expect(screen.getByText(/direct report of Lead Person/i)).toBeInTheDocument();
    });

    it("shows the sign-in CTA when no auth token is present", () => {
        mountAtToken("tok-pending");
        const cta = screen.getByRole("button", { name: /sign in to accept/i });
        expect(cta).toBeInTheDocument();
        expect(hoisted.acceptMutation).not.toHaveBeenCalled();
    });

    it("auto-fires accept when an auth token is already present", async () => {
        hoisted.authToken = "fake-jwt";
        mountAtToken("tok-auto");

        await waitFor(() => {
            expect(hoisted.acceptMutation).toHaveBeenCalledWith({ token: "tok-auto" });
        });
        await waitFor(() => {
            expect(hoisted.navigate).toHaveBeenCalledWith("..", {
                relative: "path",
                replace: true,
            });
        });
    });

    it("kicks off Auth0 loginWithRedirect when the user clicks sign-in (real mode)", async () => {
        mountAtToken("tok-need-login");
        await userEvent.click(screen.getByRole("button", { name: /sign in to accept/i }));
        expect(hoisted.loginWithRedirect).toHaveBeenCalledWith({
            appState: { returnTo: "/invite/tok-need-login" },
        });
    });

    it("renders the expired end-state without an accept button", () => {
        hoisted.preview.mockReturnValue(
            mockQueryResult({ ...PENDING_PREVIEW, status: "EXPIRED" as const }),
        );
        mountAtToken("tok-expired");
        expect(screen.getByText(/invitation has expired/i)).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /sign in to accept/i }),
        ).not.toBeInTheDocument();
    });

    it("renders the already-accepted end-state", () => {
        hoisted.preview.mockReturnValue(
            mockQueryResult({ ...PENDING_PREVIEW, status: "ACCEPTED" as const }),
        );
        mountAtToken("tok-used");
        expect(screen.getByText(/has already been used/i)).toBeInTheDocument();
    });

    it("renders the revoked end-state", () => {
        hoisted.preview.mockReturnValue(
            mockQueryResult({ ...PENDING_PREVIEW, status: "REVOKED" as const }),
        );
        mountAtToken("tok-revoked");
        expect(screen.getByText(/invitation was cancelled/i)).toBeInTheDocument();
    });

    it("shows a loading state while the preview is fetching", () => {
        hoisted.preview.mockReturnValue(mockQueryLoading());
        mountAtToken("tok-loading");
        expect(screen.getByText(/looking up your invitation/i)).toBeInTheDocument();
    });

    it("falls back to an error state when the preview query fails", () => {
        hoisted.preview.mockReturnValue(mockQueryError());
        mountAtToken("tok-bad");
        expect(screen.getByText(/couldn't find that invitation/i)).toBeInTheDocument();
    });

    it("surfaces a 403 from accept as an email-mismatch message", async () => {
        hoisted.authToken = "fake-jwt";
        hoisted.acceptMutation.mockReturnValue({
            unwrap: () => Promise.reject({ status: 403, data: null }),
        });
        mountAtToken("tok-wrong-email");

        await waitFor(() => {
            expect(
                screen.getByText(/different email/i),
            ).toBeInTheDocument();
        });
        expect(hoisted.navigate).not.toHaveBeenCalled();
    });
});
