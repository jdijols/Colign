import { Link } from "react-router-dom";

export function HostHome() {
  return (
    <main style={{ maxWidth: 860, margin: "60px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>PA Host</h1>
      <p style={{ color: "#6b7280", fontSize: 18, marginTop: 8 }}>
        Lightweight Vite shell that consumes the Weekly Commit Module as a
        Module Federation remote at runtime.
      </p>

      <div
        style={{
          marginTop: 40,
          padding: 24,
          border: "1px solid rgba(0,0,0,.1)",
          borderRadius: 12,
          background: "rgba(255,255,255,.6)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Weekly Commit Module</h2>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          The WC remote is served from <code>:5174/remoteEntry.js</code> and
          mounted unchanged at <code>/weekly-commit/*</code>. The same code
          runs standalone on :5174 — the only difference is who owns the
          BrowserRouter.
        </p>
        <Link
          to="/weekly-commit"
          style={{
            display: "inline-block",
            marginTop: 12,
            padding: "8px 16px",
            background: "#2563eb",
            color: "white",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Open Weekly Commit →
        </Link>
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 24,
          border: "1px dashed rgba(0,0,0,.15)",
          borderRadius: 12,
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        <strong>Architecture note.</strong> This page (PA host) has no
        compile-time dependency on wc-frontend. The remote is fetched at
        runtime via <code>@module-federation/vite</code>. React, ReactDOM,
        React Router, RTK, and react-redux are all declared as shared
        singletons in both <code>vite.config.ts</code> files so context
        identity survives the remote boundary.
      </div>
    </main>
  );
}
