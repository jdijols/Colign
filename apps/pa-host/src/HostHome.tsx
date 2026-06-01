import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

// In prod the canonical home is colign.org; in dev it's the local landing root.
const HOME_URL = import.meta.env.PROD ? "https://colign.org" : "/";

/**
 * Landing page at /. The typography itself enacts the colign brand:
 * three lines stating the colign thesis — short-term commitments compound
 * into long-term alignment, made concrete in what lands this week. The
 * descending visual weight (full → full → muted) mirrors the ColignMark's
 * three bars and bakes the brand etymology (commit-ment + align-ment) into
 * the manifesto before the user reads a single word.
 *
 * The reader's eye flows:
 *   brand anchor → manifesto → concrete value prop → CTA → footer.
 *
 * Authenticated visitors skip the landing entirely and land in the app.
 *
 * Accessibility:
 *   - Single semantic <h1> wraps the three visual lines (SR-friendly).
 *   - Skip link as first focusable for keyboard nav.
 *   - All interactive elements get :focus-visible rings (defined in index.html).
 *   - CTA lift animation gated by prefers-reduced-motion.
 *   - Caption-link tap zones expanded to ≥24px without changing visual layout.
 *   - All text contrast ≥7:1 (AAA) in light and dark modes.
 */
export function HostHome() {
  const navigate = useNavigate();
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleGetStarted = () => {
    void loginWithRedirect({
      appState: { returnTo: "/" },
      authorizationParams: { screen_hint: "login" },
    });
  };

  if (isLoading || isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "var(--bg)",
          color: "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-busy="true"
        aria-label="Loading"
      >
        <span aria-hidden style={{ opacity: 0.6 }}>·</span>
      </div>
    );
  }

  return (
    <>
      <a href="#main-cta" className="sr-only">
        Skip to Get started
      </a>
      <main
        id="main"
        style={{
          minHeight: "100dvh",
          background: "var(--bg)",
          color: "var(--fg)",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(28px, 4.5vw, 64px)",
        }}
      >
        {/* Brand anchor — links to the canonical home (colign.org in prod,
            local root in dev). aria-label disambiguates the icon+text combo. */}
        <header>
          <a
            href={HOME_URL}
            aria-label="colign — home"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              color: "var(--fg)",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 26,
              letterSpacing: "-0.02em",
            }}
          >
            <ColignMark size={28} />
            colign
          </a>
        </header>

        {/* Top breath — pushes the manifesto toward optical center */}
        <div style={{ flex: 1, minHeight: "clamp(48px, 10vh, 140px)" }} />

        {/* The three lines, semantically ONE statement under a single <h1>.
            SR reads: "Short-term commitments. Long-term alignment. What lands this week."
            Visual spans render as block lines with descending color. */}
        <h1
          style={{
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.04em",
          }}
        >
          <span style={headlineLineStyle("var(--fg)")}>Short-term commitments.</span>
          <span style={headlineLineStyle("var(--fg)")}>Long-term alignment.</span>
          <span style={headlineLineStyle("var(--muted)")}>
            What lands this week.
          </span>
        </h1>

        {/* Big breath — separates manifesto from concrete claim */}
        <div style={{ height: "clamp(40px, 5vw, 64px)" }} />

        {/* Value prop — what they're starting. Reads BEFORE the CTA so
            the click is informed. One sentence, no licensing chatter. */}
        <p
          style={{
            margin: 0,
            maxWidth: 640,
            fontSize: "clamp(17px, 1.4vw, 19px)",
            lineHeight: 1.5,
            color: "var(--muted)",
            textWrap: "balance",
          }}
        >
          Plans that ladder up to strategy, one week at a time.
        </p>

        {/* Tighter gap — CTA pairs with the line it answers */}
        <div style={{ height: "clamp(28px, 3vw, 40px)" }} />

        {/* CTA — physically larger so it carries against the headline mass */}
        <GetStartedButton onClick={handleGetStarted} loading={isLoading} />

        {/* Bottom breath, slightly smaller than top so content sits
            marginally above optical center (eyes track to upper third) */}
        <div style={{ flex: 1, minHeight: "clamp(40px, 8vh, 120px)" }} />

        {/* Footer — mono caption row, byline + source.
            Tap zones expanded to ≥24×24 via .colign-caption-link CSS. */}
        <footer
          style={{
            color: "var(--muted)",
            fontSize: 12,
            letterSpacing: "0.01em",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily:
              '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          <FooterLink href="https://linkedin.com/in/jasondijols">
            Jason Dijols
          </FooterLink>
          <Dot />
          <FooterLink href="https://github.com/jdijols/Colign">GitHub</FooterLink>
        </footer>
      </main>
    </>
  );
}

function headlineLineStyle(color: string) {
  return {
    margin: 0,
    fontSize: "clamp(44px, 8.5vw, 108px)",
    fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
    fontVariationSettings: '"opsz" 60',
    fontWeight: 500,
    letterSpacing: "-0.025em",
    lineHeight: 1.02,
    color,
    textWrap: "balance" as const,
  };
}

function GetStartedButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      id="main-cta"
      type="button"
      onClick={onClick}
      disabled={loading}
      data-cy="landing-get-started"
      className="colign-cta"
      style={{
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        background: "var(--fg)",
        color: "var(--bg)",
        border: "none",
        padding: "20px 28px",
        fontSize: 16,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        borderRadius: 999,
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
        fontFamily: "inherit",
        minHeight: 44,
      }}
    >
      {loading ? "Loading…" : "Get started"}
      {!loading && (
        <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
          →
        </span>
      )}
    </button>
  );
}

function Dot() {
  return (
    <span aria-hidden style={{ opacity: 0.5 }}>
      ·
    </span>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="colign-caption-link"
    >
      {children}
    </a>
  );
}

function ColignMark({ size = 24 }: { size?: number }) {
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
