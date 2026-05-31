import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import WeeklyCommitApp from "./WeeklyCommitApp";
import { Auth0ProviderWithRouter } from "@/auth/Auth0ProviderWithRouter";
import "./index.css";

/**
 * Standalone entry. Wraps with BrowserRouter (always) and Auth0ProviderWithRouter
 * (passthrough in mock mode, full Auth0 SDK in real mode). When this app is
 * consumed as an MF remote by apps/pa-host, the host's main.tsx provides
 * both wrappers and lazy-imports WeeklyCommitApp directly — this main.tsx
 * is not loaded.
 */
ReactDOM.createRoot(document.getElementById("colign-root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Auth0ProviderWithRouter>
        <WeeklyCommitApp />
      </Auth0ProviderWithRouter>
    </BrowserRouter>
  </React.StrictMode>
);
