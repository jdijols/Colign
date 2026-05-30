import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Label, Select, TextInput, Alert } from "flowbite-react";
import { HiInformationCircle } from "react-icons/hi";
import { useAppDispatch } from "@/store/hooks";
import { signIn } from "@/auth/authSlice";

type Role = "IC" | "MANAGER" | "ADMIN";

const DEMO_USERS: Array<{ email: string; role: Role; label: string }> = [
  { email: "ada@st6.dev", role: "IC", label: "Ada — IC (engineer)" },
  { email: "ben@st6.dev", role: "IC", label: "Ben — IC (engineer)" },
  { email: "manager@st6.dev", role: "MANAGER", label: "Sam — Manager" },
  { email: "admin@st6.dev", role: "ADMIN", label: "Admin" },
];

export function LoginPage() {
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
      // Relative paths so this works standalone (/login → /) AND when
      // nested under the PA host (/weekly-commit/login → /weekly-commit/).
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
          Dev sign-in. Mints a mock RS256 JWT against the backend's mock public key.
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
