import { type ReactNode } from "react";
import { Auth0Provider, type AppState } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { auth0Config, isReal } from "./auth0Config";

/**
 * Mirror of apps/wc-frontend/src/auth/Auth0ProviderWithRouter.tsx so the host
 * has its own Auth0Provider when running on :4173. Auth0 state is scoped per
 * origin (separate localStorage between :4173 and :5174), so a user signing in
 * on the host signs in into the host's Auth0 client — the embedded WC remote
 * reads from that same client via useAuth0() because Auth0Provider lives above
 * it in the tree.
 */
export function Auth0ProviderWithRouter({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  if (!isReal) return <>{children}</>;
  if (!auth0Config.domain || !auth0Config.clientId) {
    return (
      <div style={{ padding: 32, fontFamily: "system-ui" }}>
        <h2>Auth0 misconfigured</h2>
        <p>
          VITE_AUTH_MODE is "real" but VITE_AUTH0_DOMAIN / VITE_AUTH0_CLIENT_ID
          are empty. Edit <code>apps/pa-host/.env.local</code> and restart Vite.
        </p>
      </div>
    );
  }

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo ?? window.location.pathname, { replace: true });
  };

  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        audience: auth0Config.audience,
        redirect_uri: window.location.origin,
        scope: "openid profile email",
      }}
      useRefreshTokens
      cacheLocation="localstorage"
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}
