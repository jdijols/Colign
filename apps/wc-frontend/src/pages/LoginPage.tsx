import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HiArrowRight } from "react-icons/hi";
import { useAuth0 } from "@auth0/auth0-react";
import { useAppDispatch } from "@/store/hooks";
import { signIn } from "@/auth/authSlice";
import { auth0Config, isReal } from "@/auth/auth0Config";
import { ColignBrand } from "@/components/Brand";

type Role = "IC" | "MANAGER" | "ADMIN";

const DEMO_USERS: Array<{ email: string; role: Role; label: string }> = [
  { email: "ada@st6.dev", role: "IC", label: "Ada — IC" },
  { email: "ben@st6.dev", role: "IC", label: "Ben — IC" },
  { email: "manager@st6.dev", role: "MANAGER", label: "Sam — Manager" },
  { email: "admin@st6.dev", role: "ADMIN", label: "Admin" },
];

export function LoginPage() {
  return isReal ? <RealAuth0Login /> : <MockLogin />;
}

// ============================================================================
// Real Auth0 Universal Login
// ============================================================================

function RealAuth0Login() {
  const { loginWithRedirect, isLoading, error, isAuthenticated } = useAuth0();
  const location = useLocation();
  const navigate = useNavigate();
  const fromState = location.state as { from?: { pathname?: string } } | undefined;
  const returnTo =
    fromState?.from?.pathname ?? location.pathname.replace(/\/login$/, "") ?? "/";

  const [busy, setBusy] = useState<null | "login" | "signup">(null);
  const [localError, setLocalError] = useState<string | null>(null);

  if (isAuthenticated) {
    navigate("..", { replace: true });
    return null;
  }

  const startLogin = async (screenHint?: "signup" | "login") => {
    setLocalError(null);
    setBusy(screenHint === "signup" ? "signup" : "login");
    try {
      // eslint-disable-next-line no-console
      console.info("[Auth0] redirecting →", {
        domain: auth0Config.domain,
        clientId: auth0Config.clientId,
        audience: auth0Config.audience,
        redirect_uri: window.location.origin,
        screenHint,
      });
      await loginWithRedirect({
        appState: { returnTo },
        authorizationParams: screenHint ? { screen_hint: screenHint } : undefined,
      });
    } catch (e) {
      setBusy(null);
      const msg = e instanceof Error ? e.message : String(e);
      setLocalError(msg);
      // eslint-disable-next-line no-console
      console.error("[Auth0] loginWithRedirect failed", e);
    }
  };

  const issueAlert = error || localError;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex justify-center text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="lg" />
        </div>

        {/* Headline */}
        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 text-center leading-tight">
          Plan your week.
          <br />
          <span className="text-neutral-500 dark:text-neutral-400">
            Aligned by default.
          </span>
        </h1>

        {/* Auth card */}
        <div className="mt-8 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Open source weekly planning that links every commit to a strategic
            outcome. We use Auth0 for sign-in — clicking either button takes you
            to your tenant's secure login.
          </p>

          {issueAlert && (
            <div className="mt-4 rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
              <p className="font-medium">Sign-in failed</p>
              <p className="text-xs mt-0.5 leading-relaxed">{String(issueAlert)}</p>
            </div>
          )}

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => startLogin()}
              disabled={isLoading || busy !== null}
              data-cy="auth0-login"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            >
              {busy === "login" ? "Redirecting…" : (
                <>
                  Continue with Auth0
                  <HiArrowRight className="h-3.5 w-3.5" aria-hidden />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => startLogin("signup")}
              disabled={isLoading || busy !== null}
              data-cy="auth0-signup"
              className="w-full inline-flex items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            >
              {busy === "signup" ? "Redirecting…" : "Create an account"}
            </button>
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-2">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            <span className="text-[10px] uppercase tracking-wider text-neutral-500">
              Demo tip
            </span>
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          </div>

          <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            Sign up with{" "}
            <code className="rounded bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 text-[11px] text-neutral-700 dark:text-neutral-200 font-mono">
              manager@st6.dev
            </code>{" "}
            to inherit the seeded manager role and see the team roll-up. Any other
            email gets the IC view (Ada / Ben / Chris each have a pre-loaded
            plan).
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-neutral-500">
          <span>open source · MIT</span>
          <span className="text-neutral-300 dark:text-neutral-700">·</span>
          <a
            href="https://colign.org"
            className="hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            colign.org
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Mock JWT (dev-only)
// ============================================================================

function MockLogin() {
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function mint(emailToUse: string, roleToUse: Role) {
    setBusyEmail(emailToUse);
    setError(null);
    try {
      const res = await fetch(
        `/__dev__/mint?email=${encodeURIComponent(emailToUse)}&role=${roleToUse}&ttl=14400`
      );
      if (!res.ok) throw new Error(`Mint failed: HTTP ${res.status}`);
      const data = (await res.json()) as { token: string; email: string; role: Role };
      dispatch(signIn({ token: data.token, email: data.email, role: data.role }));
      navigate(roleToUse === "MANAGER" ? "../manager" : "..", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyEmail(null);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="lg" />
        </div>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 text-center">
          Mock sign-in
        </h1>
        <p className="mt-2 text-sm text-neutral-500 text-center">
          Dev mode. RS256 JWTs minted locally.
          <br />
          Set <code className="font-mono">VITE_AUTH_MODE=real</code> to use Auth0.
        </p>

        <div className="mt-6 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-2">
          {DEMO_USERS.map((u) => (
            <button
              key={u.email}
              type="button"
              disabled={busyEmail !== null}
              onClick={() => mint(u.email, u.role)}
              className="w-full inline-flex items-center justify-between rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 px-3 py-2 text-sm transition-colors"
            >
              <span className="font-medium text-neutral-900 dark:text-neutral-50">
                {u.label}
              </span>
              <span className="text-xs text-neutral-500 font-mono">{u.email}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-neutral-500">
          <span>open source · MIT</span>
          <span className="text-neutral-300 dark:text-neutral-700">·</span>
          <a href="https://colign.org" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            colign.org
          </a>
        </div>
      </div>
    </div>
  );
}
