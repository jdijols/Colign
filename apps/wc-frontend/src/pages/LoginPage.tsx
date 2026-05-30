import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Card, Label, Select, TextInput, Alert, Spinner, HR } from "flowbite-react";
import { HiInformationCircle, HiLockClosed } from "react-icons/hi";
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

// ===== Real Auth0 Universal Login =====

function RealAuth0Login() {
  const { loginWithRedirect, isLoading, error, isAuthenticated } = useAuth0();
  const location = useLocation();
  const navigate = useNavigate();
  const fromState = location.state as { from?: { pathname?: string } } | undefined;
  const returnTo = fromState?.from?.pathname ?? location.pathname.replace(/\/login$/, "") ?? "/";

  // If we returned to this page already authenticated, bounce to the app.
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center gap-2">
          <HiLockClosed className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Weekly Commit Module
          </h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Sign in via Auth0 Universal Login. Your weekly plan, commits, and reconciliations are tied to your account and persist across logins.
        </p>

        {error && (
          <Alert color="failure" icon={HiInformationCircle} className="mt-2">
            {error.message}
          </Alert>
        )}

        <div className="space-y-3 mt-4">
          <Button onClick={() => startLogin()} disabled={isLoading} data-cy="auth0-login">
            {isLoading ? <Spinner size="sm" /> : null}
            <span className={isLoading ? "ml-2" : ""}>
              {isLoading ? "Loading…" : "Log in"}
            </span>
          </Button>
          <Button color="light" onClick={() => startLogin("signup")} disabled={isLoading} data-cy="auth0-signup">
            Sign up
          </Button>
        </div>

        <HR className="my-4" />

        <p className="text-xs text-gray-500">
          Tip for the demo: signing up with <code>manager@st6.dev</code> matches
          the seeded manager user and unlocks the Team view.
        </p>
      </Card>
    </div>
  );
}

// ===== Mock JWT (dev-only, /__dev__/mint) =====

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
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Weekly Commit Module
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Dev sign-in (mock mode). Mints a mock RS256 JWT against the backend's mock public key.
          To use real Auth0 set <code>VITE_AUTH_MODE=real</code> in <code>.env.local</code>.
        </p>

        <div className="space-y-4 mt-4">
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
      </Card>
    </div>
  );
}
