import { useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { signIn } from "@/auth/authSlice";
import { isReal } from "@/auth/auth0Config";
import { ColignBrand } from "@/components/Brand";

type Role = "IC" | "MANAGER" | "ADMIN";

const DEMO_USERS: Array<{ email: string; role: Role; label: string }> = [
  { email: "ada@st6.dev", role: "IC", label: "Ada — IC" },
  { email: "ben@st6.dev", role: "IC", label: "Ben — IC" },
  { email: "manager@st6.dev", role: "MANAGER", label: "Sam — Manager" },
  { email: "admin@st6.dev", role: "ADMIN", label: "Admin" },
];

/**
 * In real (prod) auth mode there is no in-app login screen anymore: the
 * logged-out front door is the host landing (HostHome) at "/", whose CTA runs
 * the Auth0 redirect. A stray /login hit in real mode just bounces to that
 * landing. Mock/dev keeps the demo-user login below.
 */
export function LoginPage() {
  if (isReal) return <Navigate to="/" replace />;
  return <MockLogin />;
}

// ============================================================================
// Mock JWT (dev-only)
// ============================================================================

function MockLogin() {
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  // Honor an inbound `state.from` (e.g. the invitation accept page redirecting
  // unauthenticated users here): after mint, route back there so the invite
  // accept auto-runs. Falls back to role-appropriate landing otherwise.
  const fromPath = (location.state as { from?: { pathname?: string } } | null)
    ?.from?.pathname;

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
      const target = fromPath ?? (roleToUse === "MANAGER" ? "../manager" : "..");
      navigate(target, { replace: true });
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
        <p className="mt-2 text-sm text-neutral-600 text-center">
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
              <span className="text-xs text-neutral-600 font-mono">{u.email}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-neutral-600">
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
