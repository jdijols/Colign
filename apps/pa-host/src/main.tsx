import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

/**
 * Host owns BrowserRouter so the WC remote and the host's own routes share
 * one URL/history context. The wc-frontend remote provides its own Redux
 * Provider, so the host doesn't need one for itself unless it adds host-only
 * state (none today).
 *
 * Mounted into #pa-root, not #wc-root. The WC remote mounts its own UI tree
 * under the host's element when rendered.
 */
ReactDOM.createRoot(document.getElementById("pa-root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
