import { Callout } from "../components/Callout";
import { FileRef } from "../components/FileRef";
import { PageFooter } from "../components/PageFooter";
import { navLink } from "../nav";

export function GlossaryPage() {
  return (
    <article>
      <h1>Glossary & where to start.</h1>
      <p className="arch-lead">
        Two things on this page: a short dictionary so the rest of the colign
        docs make sense end-to-end, and a list of concretely-shaped first
        contributions you could take on.
      </p>

      <h2>Vocabulary</h2>

      <h3>colign</h3>
      <p>
        The product name. The codebase calls it the Weekly Commit module
        (paths like <code>apps/colign-frontend</code>, package names like{" "}
        <code>wc-backend</code>) — that's the brief's terminology and stays
        in the file tree because renaming Maven artifacts and federated
        remote module names mid-flight is more cost than value. In docs,
        prose, the host UI, and{" "}
        <a href="https://colign.org" target="_blank" rel="noopener noreferrer">
          colign.org
        </a>
        , it's "colign." MIT-licensed.
      </p>

      <h3>RCDO</h3>
      <p>
        Rally Cry → Defining Objective → Outcome. WC's proprietary OKR variant.
        A Rally Cry is the team's annual theme; Defining Objectives are
        measurable targets that contribute to it; Outcomes are key results that
        measure each objective. Outcomes can have children (Supporting
        Outcomes) via a self-FK.
      </p>

      <h3>Chess layer</h3>
      <p>
        A categorization on each weekly commit: <strong>Offense</strong>
        {" "}(new value), <strong>Defense</strong> (protect existing value),
        <strong>Maintenance</strong> (keep-the-lights-on). Stored in a lookup
        table (<code>chess_tag</code>) so labels are tunable without a schema
        migration.
      </p>

      <h3>Alignment %</h3>
      <p>
        Of the commits in a plan, the fraction linked to a P0 or P1 priority
        Outcome. Computed on demand in{" "}
        <FileRef path="apps/colign-backend/src/main/java/com/colign/service/PlanService.java" line={142} />.
        Rendered in the manager dashboard as a colored bar (green ≥ 70%, amber
        40–69%, red &lt; 40%).
      </p>

      <h3>Plan-of-record</h3>
      <p>
        The commits as they were at the moment the IC clicked Lock. After lock,
        the WeeklyCommit rows are immutable. Reconciliation writes a sidecar row
        in <code>reconciliation</code> instead of mutating the commit, so the
        record of what was planned vs. what actually happened both survive.
      </p>

      <h3>Carry-forward</h3>
      <p>
        When a plan is finalized, any commit with status MISSED is cloned into
        next week's DRAFT plan with <code>carried_from_commit_id</code> set
        back to the original. The UI shows a "carried over" badge.
      </p>

      <h3>State machine</h3>
      <p>
        DRAFT → LOCKED → RECONCILING → RECONCILED → CARRIED_FORWARD. See the
        Lifecycle page. Illegal transitions throw{" "}
        <code>IllegalTransitionException</code> → 409 Conflict.
      </p>

      <h3>Auditing entity</h3>
      <p>
        Every table has <code>created_by</code>, <code>created_date</code>,{" "}
        <code>last_modified_by</code>, <code>last_modified_date</code>, and{" "}
        <code>version</code> columns. Auto-populated by Spring's JPA auditing,
        with the auditor sourced from the JWT email (fallback: sub, then
        "system"). Base class:{" "}
        <FileRef path="apps/colign-backend/src/main/java/com/colign/domain/AbstractAuditingEntity.java" />.
      </p>

      <h3>Module Federation (MF)</h3>
      <p>
        A runtime contract that lets one Vite bundle import code from another
        Vite bundle that's deployed separately. The host knows the URL; the
        remote knows what it exposes. See the Stack page.
      </p>

      <h3>DTO / projection</h3>
      <p>
        On the backend, JPA entities are mapped to records (DTOs) before they
        cross the API boundary. Entities never leak past the service layer. See
        <code>com.wc.dto.*</code> — all DTOs are Java 21 records.
      </p>

      <h3>RTK Query tag</h3>
      <p>
        A string used to invalidate cached queries when a mutation changes
        related data. Five tag types exist:{" "}
        <code>Plan</code>, <code>Commit</code>, <code>Outcome</code>,{" "}
        <code>ChessTag</code>, <code>TeamPage</code>. Locking a plan
        invalidates that plan's tag, which auto-refetches any screen showing
        it.
      </p>

      <h2>Where to make your first contribution</h2>

      <p>
        Each of these is small enough to ship in an afternoon and touches a
        meaningful slice of the codebase. Ordered by "this is a really good
        learning task" first.
      </p>

      <h3>1. Add the <code>LOCKED → DRAFT</code> unlock path (manager-only)</h3>
      <p>
        Documented in <FileRef path="PLAN.md" /> as deferred but worth building.
        Touches: <code>PlanService.unlock()</code>, a new{" "}
        <code>PATCH /plans/{`{id}`}/unlock</code> endpoint, a manager-role
        guard (look at <code>CurrentUser.hasRole("MANAGER")</code>), an RTK
        Query mutation, and a button on the manager drill-over drawer. Good
        for getting comfortable with both halves of the stack and the state
        machine.
      </p>

      <h3>2. Show the "carried from week of X" tooltip on carried commits</h3>
      <p>
        Backend already populates <code>carried_from_commit_id</code>. The
        WeeklyCommitDto exposes it. The frontend currently doesn't surface the
        source week. Add a query that resolves the source commit's plan
        week-start-date, and show it on hover of the "carried over" badge.
      </p>

      <h3>3. Wire the admin RCDO catalog screen</h3>
      <p>
        Currently the RCDO catalog is seeded once via{" "}
        <FileRef path="apps/colign-backend/src/main/resources/db/migration/V2__demo_seed.sql" />.
        Build the <code>/admin/rcdo</code> screen with a Flowbite table that
        lists Rally Cries → Defining Objectives → Outcomes, gated to{" "}
        <code>ADMIN</code> role. Backend endpoints already exist (or are a thin
        wrapper away — see <code>OutcomeController</code>).
      </p>

      <h3>4. Replace the Auth0Bridge mock with a real token-acquisition path</h3>
      <p>
        The bridge currently passes the mock-mint token straight through. Wire
        it to call <code>getAccessTokenSilently()</code> from{" "}
        <code>@auth0/auth0-react</code> when{" "}
        <code>VITE_AUTH_MODE === "real"</code>, and dispatch the result into
        the auth slice the same way mock mode does. Documented in{" "}
        <FileRef path="docs/AUTH0_SETUP.md" />.
      </p>

      <h3>5. Add a Vitest for the carry-forward edge case</h3>
      <p>
        The "next week is already locked" branch in{" "}
        <FileRef path="apps/colign-backend/src/main/java/com/colign/service/ReconciliationService.java" line={138} />{" "}
        currently has no test. Write a backend integration test that locks
        next-week first, finalizes this-week, and asserts no rows were
        inserted into the next-week plan.
      </p>

      <Callout tone="info" title="Always start with the test, then the code">
        The brief calls for 80% JaCoCo coverage. Several of the tasks above
        will be easier to ship if you write the test first — it'll force you
        to articulate the contract before you build it.
      </Callout>

      <h2>What this site doesn't cover (yet)</h2>
      <ul>
        <li>The Cypress + Cucumber feature file and how the page-object pattern is structured.</li>
        <li>The full RTK Query tag-invalidation diagram (which mutation invalidates which query).</li>
        <li>Production deploy topology (CloudFront, EKS, etc.) — the current setup is local-only.</li>
        <li>LogRocket / Loki monitoring (intentionally out of scope per the brief).</li>
        <li>colign.org marketing surface — separate from this engineering site.</li>
      </ul>
      <p>
        If you fix one of these gaps, this is the right page to add it to.
      </p>

      <PageFooter prev={navLink("stack")} />
    </article>
  );
}
