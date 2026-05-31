import { useEffect, type ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAppDispatch } from "@/store/hooks";
import { signIn, authError, signOut } from "@/auth/authSlice";
import { auth0Config, isReal } from "./auth0Config";

/**
 * Syncs Auth0 SDK state into the Redux authSlice so RTK Query's baseApi
 * (which reads token from the store in `prepareHeaders`) keeps working
 * unchanged whether we're in real Auth0 mode or mock-JWT mode.
 *
 * Mock mode: this component is a passthrough — authSlice is populated by
 * LoginPage's call to /__dev__/mint.
 *
 * Real mode: this component listens for Auth0 auth-state changes, requests
 * the access token (cached in localStorage by the SDK), and dispatches it.
 *
 * Role here is a BOOTSTRAP value only. colign derives the authoritative role
 * from team relationships server-side (UserResolver.derivedRole) and returns it
 * from GET /me — a user becomes MANAGER the instant someone reports to them, no
 * re-login. Auth0 carries no role claim (pure identity), so the claim lookup
 * below normally yields [] and we seed IC; the real role arrives via /me.
 * The optional claim read is kept only as a forward-compatible hint (e.g. an
 * operator could seed ADMIN via a claim) and degrades safely when absent.
 */
export function Auth0Bridge({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, user, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    if (!isReal) return;
    if (isLoading) return;

    if (isAuthenticated && user) {
      let cancelled = false;
      getAccessTokenSilently({
        authorizationParams: { audience: auth0Config.audience },
      })
        .then((token) => {
          if (cancelled) return;
          const roles = (user["https://colign.org/roles"] as string[] | undefined) ?? [];
          const role = roles.includes("ADMIN")
            ? ("ADMIN" as const)
            : roles.includes("MANAGER")
            ? ("MANAGER" as const)
            : ("IC" as const);
          dispatch(signIn({
            token,
            email: user.email ?? user.sub ?? "anonymous",
            role,
          }));
        })
        .catch((err) => {
          if (cancelled) return;
          // eslint-disable-next-line no-console
          console.error("Auth0 token fetch failed:", err);
          // Surface it so AuthGate can show a retry instead of hanging on
          // "Signing you in…". The most common cause is consent_required —
          // enable "Allow Skipping User Consent" on the Auth0 API.
          const code =
            (err as { error?: string })?.error ??
            (err instanceof Error ? err.message : String(err));
          dispatch(authError(String(code)));
        });
      return () => {
        cancelled = true;
      };
    }
    if (!isAuthenticated) {
      dispatch(signOut());
    }
    return undefined;
  }, [isAuthenticated, isLoading, user, getAccessTokenSilently, dispatch]);

  return <>{children}</>;
}
