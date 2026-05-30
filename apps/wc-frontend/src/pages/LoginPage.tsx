import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Label, Select, TextInput, Alert, Spinner } from "flowbite-react";
import {
  HiInformationCircle,
  HiArrowRight,
  HiLockClosed,
  HiOutlineExternalLink,
} from "react-icons/hi";
import { useAuth0 } from "@auth0/auth0-react";
import { useAppDispatch } from "@/store/hooks";
import { signIn } from "@/auth/authSlice";
import { auth0Config, isReal } from "@/auth/auth0Config";

type Role = "IC" | "MANAGER" | "ADMIN";

const DEMO_USERS: Array<{ email: string; role: Role; label: string }> = [
  { email: "ada@st6.dev", role: "IC", label: "Ada — IC (engineer)" },
  { email: "ben@st6.dev", role: "IC", label: "Ben — IC (engineer)" },
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
      // If we reach here the SDK didn't navigate. Treat as an error.
      setLocalError(
        "Auth0 didn't redirect. Most likely cause: callback URLs aren't saved in your Auth0 SPA app's Settings."
      );
      setBusy(null);
    } catch (e) {
      setBusy(null);
      const msg = e instanceof Error ? e.message : String(e);
      setLocalError(msg);
      // eslint-disable-next-line no-console
      console.error("[Auth0] loginWithRedirect failed", e);
    }
  };

  const issueAlert = error || localError;
  const showCallbackHint = issueAlert
    ? /callback|redirect|origin|allowed|mismatch/i.test(String(issueAlert))
    : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-7 sm:p-8">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white">
              <HiLockClosed className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                Weekly Commit Module
              </h1>
              <p className="text-[11px] uppercase tracking-wider text-gray-500">
                ST6 · Strategic alignment for every commit
              </p>
            </div>
          </div>

          <h2 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
            Sign in to plan your week
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            We use <strong>Auth0 Universal Login</strong> — clicking either button
            below takes you to your tenant's secure login page, where you'll enter
            your email and password (or sign up). On return, your plans and
            commits sync to this account.
          </p>

          {/* Errors */}
          {issueAlert && (
            <Alert color="failure" icon={HiInformationCircle} className="mt-4">
              <div>
                <p className="font-semibold mb-1">Auth0 redirect didn't go through</p>
                <p className="text-sm">{String(issueAlert)}</p>
                {showCallbackHint && (
                  <ol className="mt-2 text-xs list-decimal list-inside space-y-1">
                    <li>
                      Open your Auth0 dashboard → <strong>Applications → Applications → WC SPA → Settings</strong>.
                    </li>
                    <li>
                      Set <code className="bg-red-50 dark:bg-red-950 px-1">Allowed Callback URLs</code>,{" "}
                      <code className="bg-red-50 dark:bg-red-950 px-1">Logout URLs</code>, and{" "}
                      <code className="bg-red-50 dark:bg-red-950 px-1">Web Origins</code> to:{" "}
                      <code className="block mt-1 bg-red-50 dark:bg-red-950 px-1 py-0.5">
                        http://localhost:5174, http://localhost:4173
                      </code>
                    </li>
                    <li>
                      Click <strong>Save Changes</strong> at the bottom of the page.
                    </li>
                  </ol>
                )}
              </div>
            </Alert>
          )}

          {/* Buttons */}
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => startLogin()}
              disabled={isLoading || busy !== null}
              data-cy="auth0-login"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 text-base font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {busy === "login" ? (
                <>
                  <Spinner size="sm" light />
                  Redirecting…
                </>
              ) : (
                <>
                  Continue with Auth0
                  <HiArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => startLogin("signup")}
              disabled={isLoading || busy !== null}
              data-cy="auth0-signup"
              className="w-full inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {busy === "signup" ? (
                <>
                  <Spinner size="sm" />
                  <span className="ml-2">Redirecting…</span>
                </>
              ) : (
                <>Create a new account</>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs uppercase tracking-wider text-gray-400">
              Demo tip
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Sign up with{" "}
            <code className="rounded bg-gray-100 dark:bg-gray-800 px-1 py-0.5 text-[11px] text-gray-700 dark:text-gray-200">
              manager@st6.dev
            </code>{" "}
            to inherit the seeded manager role and unlock the Team view. Any other
            email gets the IC view — Ada / Ben / Chris each have a pre-loaded
            plan you can also impersonate.
          </p>
        </div>

        <p className="mt-3 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
          Auth handled by
          <a
            href={`https://${auth0Config.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600 dark:hover:text-gray-300 inline-flex items-center gap-0.5"
          >
            {auth0Config.domain || "Auth0"}
            <HiOutlineExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Mock JWT (dev-only, /__dev__/mint)
// ============================================================================

function MockLogin() {
  const [email, setEmail] = useState("ada@st6.dev");
  const [role, setRole] = useState<Role>("IC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function mint(emailToUse: string, roleToUse: Role) {
    setLoading(true);
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
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Weekly Commit Module
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Dev sign-in (mock mode). Mints a mock RS256 JWT against the backend's mock
          public key. To use real Auth0 set <code>VITE_AUTH_MODE=real</code> in{" "}
          <code>.env.local</code>.
        </p>

        <div className="space-y-4 mt-6">
          <div>
            <Label htmlFor="demo" value="Quick demo users" />
            <div className="mt-2 grid grid-cols-1 gap-2">
              {DEMO_USERS.map((u) => (
                <Button
                  key={u.email}
                  color={u.role === "MANAGER" ? "purple" : "blue"}
                  disabled={loading}
                  onClick={() => mint(u.email, u.role)}
                >
                  Sign in as {u.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Or custom
            </p>
            <Label htmlFor="email" value="Email" />
            <TextInput
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
            <Label htmlFor="role" value="Role" className="mt-3 block" />
            <Select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1"
            >
              <option value="IC">IC</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </Select>
            <Button
              className="mt-4 w-full"
              disabled={loading || !email}
              onClick={() => mint(email, role)}
            >
              {loading ? "Minting…" : "Sign in"}
            </Button>
          </div>

          {error && (
            <Alert color="failure" icon={HiInformationCircle}>
              {error}
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
