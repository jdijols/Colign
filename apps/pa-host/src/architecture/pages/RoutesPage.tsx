import { Callout } from "../components/Callout";
import { Code } from "../components/Code";
import { FileRef } from "../components/FileRef";
import { PageFooter } from "../components/PageFooter";
import { navLink } from "../nav";

export function RoutesPage() {
  return (
    <article>
      <h1>Routes & Screens</h1>
      <p className="arch-lead">
        Five user-facing screens on the frontend, eleven REST endpoints on the
        backend. The frontend routes are defined in{" "}
        <FileRef path="apps/wc-frontend/src/WeeklyCommitApp.tsx" />; the backend
        endpoints live under <code>com.wc.controller</code>.
      </p>

      <h2>Frontend routes</h2>
      <p>
        The WC remote owns its own internal router. The same code runs
        standalone on <code>:5174</code> and mounted inside pa-host at{" "}
        <code>/weekly-commit/*</code> — relative paths make both work.
      </p>

      <table className="arch-table">
        <thead>
          <tr>
            <th>Path</th>
            <th>Screen</th>
            <th>Audience</th>
            <th>Top APIs called</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>/login</code></td>
            <td><strong>Login</strong> — Auth0 redirect or mock-mint button.</td>
            <td>Anyone unauthenticated.</td>
            <td><code>/__dev__/mint</code> (dev only)</td>
          </tr>
          <tr>
            <td><code>/</code></td>
            <td>
              <strong>My Weekly Plan</strong> — list of this week's commits,
              add/edit/delete, lock button.
            </td>
            <td>IC</td>
            <td>
              <code>GET /plans/current</code><br />
              <code>POST /plans/{`{id}`}/commits</code><br />
              <code>PATCH /commits/{`{id}`}</code><br />
              <code>PATCH /plans/{`{id}`}/lock</code>
            </td>
          </tr>
          <tr>
            <td><code>/reconcile</code></td>
            <td>
              <strong>Reconciliation</strong> — planned-vs-actual diff, per-commit
              done/partial/dropped, finalize button.
            </td>
            <td>IC</td>
            <td>
              <code>PATCH /plans/{`{id}`}/start-reconciliation</code><br />
              <code>POST /commits/{`{id}`}/reconciliation</code><br />
              <code>PATCH /plans/{`{id}`}/finalize-reconciliation</code>
            </td>
          </tr>
          <tr>
            <td><code>/manager</code></td>
            <td>
              <strong>Team Roll-up</strong> — paginated table of direct reports,
              alignment %, reconciled %, "needs review" badge.
            </td>
            <td>Manager</td>
            <td><code>GET /manager/team?page=&amp;size=&amp;sort=</code></td>
          </tr>
          <tr>
            <td><code>/manager</code> (drawer)</td>
            <td>
              <strong>IC Drill-over</strong> — right-anchored slide-over with the
              IC's reconciliation, read-only with approve/comment.
            </td>
            <td>Manager</td>
            <td><code>GET /plans/{`{id}`}</code></td>
          </tr>
        </tbody>
      </table>

      <Callout tone="info" title="Why a drawer instead of a modal">
        Drilling into one IC's plan shouldn't lose the manager's place in the
        team table. A right-anchored drawer keeps the table visible behind it
        and lets the manager close + open the next IC without re-sorting.
      </Callout>

      <h2>The auth gate, in one component</h2>
      <p>
        Every authenticated route is wrapped in <code>AuthGate</code>, which
        redirects to <code>/login</code> if no JWT is in the Redux store.
        Source: <FileRef path="apps/wc-frontend/src/auth/AuthGate.tsx" />.
      </p>

      <Code>{`<Route element={<AuthGate><AppShell /></AuthGate>}>
  <Route index element={<WeeklyPlanPage />} />
  <Route path="reconcile" element={<ReconcilePage />} />
  <Route path="manager" element={<ManagerDashboardPage />} />
</Route>`}</Code>

      <h2>Backend endpoints, grouped by controller</h2>

      <h3><code>PlanController</code></h3>
      <p>
        Source: <FileRef path="apps/wc-backend/src/main/java/com/wc/controller/PlanController.java" />.
      </p>
      <table className="arch-table">
        <thead><tr><th>Method</th><th>Path</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td>GET</td><td><code>/api/v1/plans/current</code></td><td>Get-or-create the JWT user's plan for "this week" (Monday-of-this-week, UTC). Idempotent.</td></tr>
          <tr><td>POST</td><td><code>/api/v1/plans</code></td><td>Get-or-create for an arbitrary week.</td></tr>
          <tr><td>GET</td><td><code>/api/v1/plans/{`{id}`}</code></td><td>Read by id.</td></tr>
          <tr><td>PATCH</td><td><code>/api/v1/plans/{`{id}`}/lock</code></td><td>DRAFT → LOCKED. 409 if empty.</td></tr>
        </tbody>
      </table>

      <h3><code>WeeklyCommitController</code></h3>
      <p>
        Source: <FileRef path="apps/wc-backend/src/main/java/com/wc/controller/WeeklyCommitController.java" />.
      </p>
      <table className="arch-table">
        <thead><tr><th>Method</th><th>Path</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td>POST</td><td><code>/api/v1/plans/{`{planId}`}/commits</code></td><td>Add a commit. Plan must be DRAFT.</td></tr>
          <tr><td>PATCH</td><td><code>/api/v1/commits/{`{id}`}</code></td><td>Update fields. Plan must be DRAFT.</td></tr>
          <tr><td>DELETE</td><td><code>/api/v1/commits/{`{id}`}</code></td><td>Delete. Plan must be DRAFT.</td></tr>
        </tbody>
      </table>

      <h3><code>ReconciliationController</code></h3>
      <p>
        Source: <FileRef path="apps/wc-backend/src/main/java/com/wc/controller/ReconciliationController.java" />.
      </p>
      <table className="arch-table">
        <thead><tr><th>Method</th><th>Path</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td>PATCH</td><td><code>/api/v1/plans/{`{id}`}/start-reconciliation</code></td><td>LOCKED → RECONCILING.</td></tr>
          <tr><td>POST</td><td><code>/api/v1/commits/{`{id}`}/reconciliation</code></td><td>Write/replace one commit's reconciliation row.</td></tr>
          <tr><td>GET</td><td><code>/api/v1/commits/{`{id}`}/reconciliation</code></td><td>Read it back.</td></tr>
          <tr><td>PATCH</td><td><code>/api/v1/plans/{`{id}`}/finalize-reconciliation</code></td><td>RECONCILING → RECONCILED + carry-forward.</td></tr>
        </tbody>
      </table>

      <h3>Catalog + manager</h3>
      <table className="arch-table">
        <thead><tr><th>Method</th><th>Path</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td>GET</td><td><code>/api/v1/outcomes?page=&amp;size=</code></td><td>Paginated Outcome catalog (with hydrated parent labels for the combobox).</td></tr>
          <tr><td>GET</td><td><code>/api/v1/chess-tags</code></td><td>Lookup list: OFFENSE / DEFENSE / MAINTENANCE.</td></tr>
          <tr><td>GET</td><td><code>/api/v1/manager/team?page=&amp;size=&amp;sort=</code></td><td>Direct reports + each one's most recent plan, paginated.</td></tr>
        </tbody>
      </table>

      <h2>The frontend ↔ backend wiring</h2>
      <p>
        All HTTP calls go through RTK Query. The base config is in{" "}
        <FileRef path="apps/wc-frontend/src/api/baseApi.ts" />:
      </p>
      <Code>{`export const wcApi = createApi({
  reducerPath: "wcApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/v1/",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set("authorization", \`Bearer \${token}\`);
      return headers;
    },
  }),
  tagTypes: ["Plan", "Commit", "Outcome", "ChessTag", "TeamPage"],
  endpoints: () => ({}),
});`}</Code>

      <p>
        Each domain area injects its endpoints onto this base — see{" "}
        <FileRef path="apps/wc-frontend/src/api/plans.ts" />,{" "}
        <FileRef path="apps/wc-frontend/src/api/commits.ts" />,{" "}
        <FileRef path="apps/wc-frontend/src/api/team.ts" />, etc.
      </p>

      <PageFooter prev={navLink("lifecycle")} next={navLink("auth")} />
    </article>
  );
}
