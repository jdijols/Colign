import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { Auth0ProviderWithRouter } from "./auth/Auth0ProviderWithRouter";

/**
 * Host owns BrowserRouter + Auth0ProviderWithRouter so the embedded WC remote
 * inherits both contexts. The WC remote brings its own Redux Provider and an
 * Auth0Bridge that syncs Auth0 state into the WC store.
 *
 * Auth0Provider is a passthrough in mock mode (controlled by VITE_AUTH_MODE
 * in apps/pa-host/.env.local).
 */
ReactDOM.createRoot(document.getElementById("pa-root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Auth0ProviderWithRouter>
        <App />
      </Auth0ProviderWithRouter>
    </BrowserRouter>
  </React.StrictMode>
);
