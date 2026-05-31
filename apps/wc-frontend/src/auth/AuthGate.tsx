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
 * Real Auth0 mode: defer to the SDK's own auth state. The subtlety the old
 * version got wrong — the store token arrives *asynchronously* from
 * Auth0Bridge (it calls getAccessTokenSilently). Gating purely on the store
 * token meant a freshly-authenticated user was redirected to /login before the
 * bridge had a chance to populate it. Now we only redirect when Auth0 is
 * definitively unauthenticated, and show a loading state in the in-between.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const token = useAppSelector((s) => s.auth.token);
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth0();

  if (isReal) {
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
