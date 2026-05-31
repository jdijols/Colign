import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { HiArrowRight, HiOutlineExclamationCircle } from "react-icons/hi";
import { useAppSelector } from "@/store/hooks";
import { isReal } from "@/auth/auth0Config";
import {
  useAcceptInvitationMutation,
  usePreviewInvitationQuery,
  type InvitationStatus,
} from "@/api/invites";
import { ColignBrand } from "@/components/Brand";

/**
 * The public landing page for an invitation email link.
 *
 * The route is mounted OUTSIDE AuthGate so the recipient can reach it from
 * their email before logging in. We render in two phases:
 *
 * 1. Anyone: fetch {@code GET /api/v1/invitations/{token}} (public preview)
 *    and show "Join {team} as {report|peer} of {inviter}".
 * 2. Once {@code authSlice.token} is populated (mock-mode mint complete or
 *    Auth0Bridge has dispatched the access token), automatically POST accept.
 *    Email-match is enforced server-side; we just surface the 403.
 *
 * For non-PENDING preview states (EXPIRED / ACCEPTED / REVOKED) we show an
 * informational end-state instead of an accept button. The accept POST is
 * never fired for those, which matches the server's GONE response shape.
 */
export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithRedirect } = useAuth0();
  const authToken = useAppSelector((s) => s.auth.token);

  const {
    data: preview,
    isLoading: previewLoading,
    isError: previewError,
  } = usePreviewInvitationQuery(
    { token: token ?? "" },
    { skip: !token }
  );

  const [acceptInvitation, { isLoading: accepting }] = useAcceptInvitationMutation();
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);

  // Auto-fire accept the moment we have both a JWT and a pending invitation.
  // Guarded by hasAttempted so a transient cache update / token refresh
  // doesn't double-send (the mutation is idempotent server-side for the
  // same-team case, but POSTing twice is still wasteful).
  useEffect(() => {
    if (!token || !authToken || !preview) return;
    if (preview.status !== "PENDING") return;
    if (hasAttempted) return;

    setHasAttempted(true);
    setAcceptError(null);
    acceptInvitation({ token })
      .unwrap()
      .then(() => {
        // The accept response IS the refreshed Me and is already in the
        // getMe cache via onQueryStarted. Land in the app.
        navigate("..", { relative: "path", replace: true });
      })
      .catch((err) => {
        const status = (err as { status?: number })?.status;
        const detail = (err as { data?: { detail?: string } })?.data?.detail;
        setAcceptError(
          detail ??
            (status === 403
              ? "This invitation is for a different email. Sign in with the address it was sent to."
              : status === 409
              ? "You're already on a different team. Leave it before joining this one."
              : status === 410
              ? "This invitation isn't valid anymore."
              : "Couldn't accept the invitation. Try again.")
        );
      });
  }, [token, authToken, preview, hasAttempted, acceptInvitation, navigate]);

  if (!token) {
    return <Centered message="Missing invite token." />;
  }
  if (previewLoading) {
    return <Centered message="Looking up your invitation…" />;
  }
  if (previewError || !preview) {
    return (
      <EndState
        kind="error"
        title="We couldn't find that invitation"
        body="The link may have a typo, or it was revoked. Ask the person who invited you to send a new one."
      />
    );
  }

  const status: InvitationStatus = preview.status;

  if (status === "EXPIRED") {
    return (
      <EndState
        kind="info"
        title="This invitation has expired"
        body={`Ask ${preview.inviterDisplayName} to send a new one — invites are good for 14 days.`}
      />
    );
  }
  if (status === "ACCEPTED") {
    return (
      <EndState
        kind="info"
        title="This invitation has already been used"
        body="If that wasn't you, ask for a fresh invite."
      />
    );
  }
  if (status === "REVOKED") {
    return (
      <EndState
        kind="info"
        title="This invitation was cancelled"
        body={`Ask ${preview.inviterDisplayName} to resend it.`}
      />
    );
  }

  // PENDING — accept flow.
  const relationshipLabel =
    preview.relationship === "REPORT"
      ? `as a direct report of ${preview.inviterDisplayName}`
      : `as a teammate of ${preview.inviterDisplayName}`;

  const startSignIn = () => {
    if (isReal) {
      // Auth0 will redirect back to origin; Auth0ProviderWithRouter.onRedirectCallback
      // honors appState.returnTo so we land back here as authenticated.
      void loginWithRedirect({
        appState: { returnTo: location.pathname },
      });
    } else {
      // Mock mode: LoginPage reads location.state.from.pathname (see LoginPage).
      navigate("../login", {
        relative: "path",
        state: { from: { pathname: location.pathname } },
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="lg" />
        </div>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 text-center leading-tight">
          You're invited to
          <br />
          <span className="text-neutral-600 dark:text-neutral-400">{preview.teamName}</span>
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 text-center leading-relaxed">
          {`Join ${relationshipLabel}.`}
        </p>

        {acceptError ? (
          <div className="mt-6 rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300 flex gap-2">
            <HiOutlineExclamationCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
            <span>{acceptError}</span>
          </div>
        ) : null}

        {authToken ? (
          // Logged in — accept is firing or already fired. Keep the user oriented.
          <div className="mt-8 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {accepting || !hasAttempted ? "Joining…" : ""}
            </p>
          </div>
        ) : (
          <button
            type="button"
            data-cy="invite-accept-signin"
            onClick={startSignIn}
            className="mt-8 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 dark:bg-white px-4 py-3 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
          >
            Sign in to accept
            <HiArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}

        <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-500 leading-relaxed">
          Use the same email address this invite was sent to.
        </p>
      </div>
    </div>
  );
}

function Centered({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">{message}</span>
    </div>
  );
}

function EndState({
  kind,
  title,
  body,
}: {
  kind: "info" | "error";
  title: string;
  body: string;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="lg" />
        </div>
        <h1
          className={
            "mt-8 text-xl font-semibold tracking-tight " +
            (kind === "error"
              ? "text-rose-700 dark:text-rose-300"
              : "text-neutral-900 dark:text-neutral-50")
          }
        >
          {title}
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {body}
        </p>
      </div>
    </div>
  );
}
