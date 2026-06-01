import { type ReactNode } from "react";
import { Auth0Provider, type AppState } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { auth0Config, isReal } from "./auth0Config";

/**
 * Wraps the Auth0 SDK's Auth0Provider with react-router integration so the
 * SDK's redirect callback uses the in-app router (no full page reload), and
 * the URL is cleaned up after the OAuth params are consumed.
 *
 * Passthrough in mock mode — the rest of the tree never sees an Auth0Provider
 * and the Auth0Bridge silently no-ops.
 */
export function Auth0ProviderWithRouter({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  if (!isReal) {
    return <>{children}</>;
  }

  if (!auth0Config.domain || !auth0Config.clientId) {
    return (
      <div style={{ padding: 32, fontFamily: "system-ui" }}>
        <h2>Auth0 misconfigured</h2>
        <p>
          VITE_AUTH_MODE is “real” but VITE_AUTH0_DOMAIN or VITE_AUTH0_CLIENT_ID is empty. Edit{" "}
          <code>apps/colign-frontend/.env.local</code> and restart Vite.
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
