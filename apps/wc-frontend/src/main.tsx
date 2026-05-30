import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import WeeklyCommitApp from "./WeeklyCommitApp";
import "./index.css";

/**
 * Standalone entry. Only runs when this app is launched on its own
 * (`yarn dev` → :5174). When consumed as an MF remote by apps/pa-host,
 * the host's App.tsx wraps WeeklyCommitApp in its own BrowserRouter and
 * lazy-imports it directly — this main.tsx is not loaded.
 */
ReactDOM.createRoot(document.getElementById("wc-root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WeeklyCommitApp />
    </BrowserRouter>
  </React.StrictMode>
);
