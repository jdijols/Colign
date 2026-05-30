import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Label, Select, TextInput, Alert, Spinner } from "flowbite-react";
import {
  HiInformationCircle,
  HiArrowRight,
  HiOutlineFlag,
  HiOutlineCheckCircle,
  HiOutlineChartBar,
} from "react-icons/hi";
import { useAuth0 } from "@auth0/auth0-react";
import { useAppDispatch } from "@/store/hooks";
import { signIn } from "@/auth/authSlice";
import { isReal } from "@/auth/auth0Config";

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

  if (isAuthenticated) {
    navigate("..", { replace: true });
    return null;
  }

  const startLogin = (screenHint?: "signup" | "login") =>
    loginWithRedirect({
      appState: { returnTo },
      authorizationParams: screenHint ? { screen_hint: screenHint } : undefined,
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 items-center">
          {/* ---- Hero / value props ---- */}
          <div className="md:col-span-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 dark:bg-blue-950 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
              Weekly Commit Module
            </div>

            <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              Plan the week.
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">
                Linked to strategy by default.
              </span>
            </h1>

            <p className="mt-5 text-lg text-gray-600 dark:text-gray-300 max-w-xl">
              A replacement for 15-Five where every weekly commit has a
              structural link to a Rally Cry → Defining Objective → Outcome.
              Drift becomes visible the moment it happens.
            </p>

            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
              <ValueProp
                icon={<HiOutlineFlag className="h-5 w-5" />}
                title="RCDO-linked commits"
                body="Every commit picks a leaf Outcome. No optional fields."
              />
              <ValueProp
                icon={<HiOutlineCheckCircle className="h-5 w-5" />}
                title="Lock → reconcile"
                body="State machine carries missed commits to next week."
              />
              <ValueProp
                icon={<HiOutlineChartBar className="h-5 w-5" />}
                title="Manager roll-up"
                body="Alignment % per IC. Drill into any week."
              />
            </ul>

            <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
              Built for ST6 · Spring Boot 3.3 · Vite Module Federation ·
              Auth0 OAuth2 · PostgreSQL 16
            </p>
          </div>

          {/* ---- Auth card ---- */}
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Sign in to plan your week
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Your plan, commits, and reconciliations are tied to your account.
              </p>

              {error && (
                <Alert color="failure" icon={HiInformationCircle} className="mt-4">
                  {error.message}
                </Alert>
              )}

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => startLogin()}
                  disabled={isLoading}
                  data-cy="auth0-login"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 text-base font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  {isLoading ? (
                    <Spinner size="sm" light />
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
                  disabled={isLoading}
                  data-cy="auth0-signup"
                  className="w-full inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  New here? Create an account
                </button>
              </div>

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
                to inherit the seeded manager role and see the team roll-up.
                Any other email gets the IC view (Ada / Ben / Chris each have
                a pre-loaded plan).
              </p>
            </div>

            <p className="mt-3 text-center text-xs text-gray-400">
              Auth handled by{" "}
              <a
                href="https://auth0.com"
                className="underline hover:text-gray-600 dark:hover:text-gray-300"
              >
                Auth0
              </a>{" "}
              · open standards (OIDC + OAuth2)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueProp({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex flex-col gap-1.5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        {icon}
      </span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
      <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        {body}
      </span>
    </li>
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
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
