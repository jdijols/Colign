import { Link } from "react-router-dom";

const brand = {
  text: "var(--fg)",
  muted: "var(--muted)",
  border: "var(--border)",
  surface: "var(--surface)",
};

function ColignMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="2" rx="1" />
      <rect x="3" y="11" width="13" height="2" rx="1" />
      <rect x="3" y="17" width="8" height="2" rx="1" />
    </svg>
  );
}

export function HostHome() {
  return (
    <main style={{ maxWidth: 880, margin: "80px auto", padding: "0 24px" }}>
      {/* Hero */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: brand.text }}>
        <ColignMark size={28} />
        <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>colign</span>
      </div>

      <h1
        style={{
          marginTop: 32,
          fontSize: 48,
          fontWeight: 600,
          letterSpacing: "-0.025em",
          lineHeight: 1.05,
          color: brand.text,
        }}
      >
        Aligned weeks.
        <br />
        <span style={{ color: brand.muted }}>Visible strategy.</span>
      </h1>
      <p
        style={{
          marginTop: 16,
          color: brand.muted,
          fontSize: 18,
          maxWidth: 620,
          lineHeight: 1.55,
        }}
      >
        Open source weekly planning where every commit links to a strategic outcome.
        Replaces 15-Five with structural alignment — built for engineering organizations
        that care about the line from strategy to execution.
      </p>

      {/* Tag chips */}
      <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {["Spring Boot 3.3", "Vite Module Federation", "Auth0 OIDC", "PostgreSQL 16", "MIT"].map(
          (chip) => (
            <span
              key={chip}
              style={{
                fontSize: 11,
                color: brand.muted,
                border: `1px solid ${brand.border}`,
                padding: "4px 10px",
                borderRadius: 999,
                letterSpacing: "0.02em",
              }}
            >
              {chip}
            </span>
          )
        )}
      </div>

      {/* Cards */}
      <div
        style={{
          marginTop: 56,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        <Card
          title="Open the app"
          body="The Weekly Commit module — federated remote loaded at runtime from :5174."
          cta="Open colign"
          to="/weekly-commit"
          primary
        />
        <Card
          title="Architecture & onboarding"
          body="Guided tour of the data model, weekly lifecycle, routes, and the MF setup."
          cta="Open architecture site"
          to="/architecture"
        />
      </div>

      {/* Footnote */}
      <div
        style={{
          marginTop: 56,
          paddingTop: 24,
          borderTop: `1px solid ${brand.border}`,
          color: brand.muted,
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: brand.text, fontWeight: 600 }}>How it's wired.</strong>{" "}
        This page is the PA host shell — it has no compile-time dependency on the WC
        remote. <code>remoteEntry.js</code> is fetched at runtime via{" "}
        <code>@module-federation/vite</code>. React, ReactDOM, React Router, RTK, and
        react-redux are shared singletons across both apps so context identity survives
        the remote boundary. The Architecture site lives inside this host as a normal
        lazy-imported sub-app (no need for it to be a federated remote).
        <br />
        <br />
        Built for the ST6 partnership submission as the Weekly Commit Module — opened up
        as an MIT-licensed standalone project at{" "}
        <a
          href="https://colign.org"
          style={{ color: brand.text, textDecoration: "underline" }}
        >
          colign.org
        </a>
        .
      </div>
    </main>
  );
}

function Card({
  title,
  body,
  cta,
  to,
  primary,
}: {
  title: string;
  body: string;
  cta: string;
  to: string;
  primary?: boolean;
}) {
  return (
    <div
      style={{
        padding: 24,
        border: `1px solid ${brand.border}`,
        borderRadius: 10,
        background: brand.surface,
        transition: "border-color 120ms ease",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: brand.text,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      <p style={{ marginTop: 8, color: brand.muted, fontSize: 14, lineHeight: 1.55 }}>
        {body}
      </p>
      <Link
        to={to}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginTop: 16,
          padding: primary ? "8px 14px" : "8px 0",
          background: primary ? brand.text : "transparent",
          color: primary ? brand.surface : brand.text,
          borderRadius: 6,
          textDecoration: "none",
          fontWeight: 500,
          fontSize: 13,
        }}
      >
        {cta} →
      </Link>
    </div>
  );
}
