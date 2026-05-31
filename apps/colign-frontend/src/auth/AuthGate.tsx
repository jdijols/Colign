import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useAppSelector } from "@/store/hooks";
import { isReal } from "@/auth/auth0Config";

/**
 * Guards the authenticated app routes.
 *
 * Mock mode: the presence of a minted JWT in the store is the gate.
 *
 * Real Auth0 mode: defer to the SDK's own auth state. The store token arrives
 * asynchronously from Auth0Bridge (which calls getAccessTokenSilently), so we
 * only redirect when Auth0 is definitively unauthenticated, and show a loading
 * state in the in-between. If the token fetch FAILS (authSlice.error set), we
 * surface it with a retry instead of hanging on "Signing you in…" forever.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const token = useAppSelector((s) => s.auth.token);
  const error = useAppSelector((s) => s.auth.error);
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth0();

  if (isReal) {
    // Authenticated with Auth0, but our token fetch failed → actionable error.
    if (isAuthenticated && !token && error) {
      return <AuthFailed error={error} />;
    }
    // Auth0 still resolving, or authenticated-but-token-not-yet-synced.
    if (isLoading || (isAuthenticated && !token)) {
      return <AuthLoading />;
    }
    if (!isAuthenticated) {
      return <Navigate to="login" replace state={{ from: location }} />;
    }
    return <>{children}</>;
  }

  // Mock mode.
  if (!token) {
    return <Navigate to="login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">
        Signing you in…
      </span>
    </div>
  );
}

/**
 * Token acquisition failed after authentication. Most often this is
 * `consent_required` — fix by enabling "Allow Skipping User Consent" on the
 * Auth0 API. We give the user a clean way out rather than an infinite spinner.
 */
function AuthFailed({ error }: { error: string }) {
  const { loginWithRedirect, logout } = useAuth0();
  const isConsent = /consent/i.test(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950 p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Couldn't finish signing in
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {isConsent
            ? "Authorization needs consent that couldn't be granted silently. Try again — if it persists, the Auth0 API needs “Allow Skipping User Consent” enabled."
            : "Your session was created but we couldn't retrieve an access token."}
        </p>
        <p className="mt-2 text-[11px] font-mono text-neutral-500 dark:text-neutral-500 break-all">
          {error}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() =>
              loginWithRedirect({ appState: { returnTo: "/weekly-commit" } })
            }
            className="w-full rounded-md bg-neutral-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() =>
              logout({ logoutParams: { returnTo: window.location.origin } })
            }
            className="w-full rounded-md px-4 py-2.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
