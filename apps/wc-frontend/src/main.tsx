import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@/store";
import WeeklyCommitApp from "./WeeklyCommitApp";
import "./index.css";

/**
 * Standalone wrapper. When this app is consumed as a Module Federation REMOTE
 * by the PA host, the host owns Provider + BrowserRouter and lazy-imports
 * WeeklyCommitApp directly. This main.tsx only runs when wc-frontend is launched
 * on its own (`yarn dev` on port 5174).
 */
ReactDOM.createRoot(document.getElementById("wc-root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <WeeklyCommitApp />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
