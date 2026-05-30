import { Mermaid } from "../Mermaid";
import { Callout } from "../components/Callout";
import { Code } from "../components/Code";
import { FileRef } from "../components/FileRef";
import { PageFooter } from "../components/PageFooter";
import { navLink } from "../nav";

const ERD = `
erDiagram
  TEAM ||--o{ APP_USER : "groups"
  APP_USER ||--o{ APP_USER : "manages (self-FK)"
  TEAM ||--o{ RALLY_CRY : "owns"
  RALLY_CRY ||--o{ DEFINING_OBJECTIVE : "decomposes into"
  DEFINING_OBJECTIVE ||--o{ OUTCOME : "measured by"
  OUTCOME ||--o{ OUTCOME : "supports (self-FK)"
  APP_USER ||--o{ PLAN : "owns per week"
  PLAN ||--o{ WEEKLY_COMMIT : "contains"
  OUTCOME ||--o{ WEEKLY_COMMIT : "structurally aligns"
  CHESS_TAG ||--o{ WEEKLY_COMMIT : "tags (optional)"
  WEEKLY_COMMIT ||--o| RECONCILIATION : "is reconciled by"
  WEEKLY_COMMIT ||--o| WEEKLY_COMMIT : "carried_from (self-FK)"

  TEAM { bigint id PK }
  APP_USER {
    bigint id PK
    string email UK
    enum role
    bigint manager_id FK
    bigint team_id FK
  }
  RALLY_CRY {
    bigint id PK
    bigint team_id FK
    date horizon_start
    date horizon_end
  }
  DEFINING_OBJECTIVE {
    bigint id PK
    bigint rally_cry_id FK
  }
  OUTCOME {
    bigint id PK
    bigint defining_objective_id FK
    bigint parent_outcome_id FK
    string priority_tier
  }
  CHESS_TAG {
    bigint id PK
    string code
  }
  PLAN {
    bigint id PK
    bigint user_id FK
    date week_start_date
    enum state
  }
  WEEKLY_COMMIT {
    bigint id PK
    bigint plan_id FK
    bigint outcome_id FK
    bigint chess_tag_id FK
    bigint carried_from_commit_id FK
    enum status
  }
  RECONCILIATION {
    bigint id PK
    bigint weekly_commit_id UK
    string actual_status
  }
`.trim();

const RCDO_DIAGRAM = `
flowchart TB
  rc["Rally Cry<br/>(team-scoped, time-bounded)"]
  do1[Defining Objective A]
  do2[Defining Objective B]
  o1[Outcome 1 — P0]
  o2[Outcome 2 — P1]
  o3[Outcome 3 — P1]
  o4[Outcome 4 — P2]
  s1[Supporting Outcome — parent: O3]
  c["weekly_commit<br/>FK → Outcome.id (NOT NULL)"]

  rc --> do1
  rc --> do2
  do1 --> o1
  do1 --> o2
  do2 --> o3
  do2 --> o4
  o3 --> s1
  c -.aligned to.-> o1
`.trim();

export function DataModelPage() {
  return (
    <article>
      <h1>Data Model</h1>
      <p className="arch-lead">
        Nine tables. The shape is "people on the left, strategy in the middle,
        weekly work on the right" — and a non-nullable foreign key chains them
        together. Migration{" "}
        <FileRef path="apps/wc-backend/src/main/resources/db/migration/V1__init.sql" /> is
        the source of truth.
      </p>

      <h2>The whole picture</h2>
      <Mermaid
        chart={ERD}
        caption="Crow's-foot ERD. Two self-FKs to know about: app_user.manager_id (manager → reports) and outcome.parent_outcome_id (Supporting Outcomes)."
      />

      <h2>The RCDO hierarchy</h2>
      <p>
        RCDO — <strong>Rally Cry → Defining Objective → Outcome</strong> — is
        WC's proprietary OKR variant. Each layer narrows scope:
      </p>
      <ul>
        <li>
          <strong>Rally Cry.</strong> A team's top-level theme for a horizon
          (typically a year). One sentence: "Ship faster, support stronger."
          Owned by a <code>Team</code>, time-bounded by{" "}
          <code>horizon_start</code> and <code>horizon_end</code>.
        </li>
        <li>
          <strong>Defining Objective.</strong> A measurable target that
          contributes to a Rally Cry. "Cut p95 API latency to 200ms."
        </li>
        <li>
          <strong>Outcome.</strong> A key result — the leaf of the hierarchy.
          "Auth endpoint p95 ≤ 200ms." Carries a metric type, target, baseline,
          current value, and a priority tier (P0–P3).
        </li>
      </ul>

      <Mermaid
        chart={RCDO_DIAGRAM}
        caption="An Outcome can also point at a parent Outcome — a Supporting Outcome — for unlimited-depth alignment without an extra join table."
      />

      <h2>The three load-bearing invariants</h2>

      <Callout tone="ok" title="1. weekly_commit.outcome_id is NOT NULL">
        This is the entire reason WC exists as a 15-Five replacement. Schema
        line in <FileRef path="V1__init.sql" line={175} />:
        <Code>{`outcome_id BIGINT NOT NULL REFERENCES outcome(id), -- STRUCTURAL ALIGNMENT GUARANTEE`}</Code>
        You cannot insert a commit without picking an Outcome. The frontend
        enforces this in the combobox; the database guarantees it.
      </Callout>

      <Callout tone="ok" title="2. UNIQUE (user_id, week_start_date) on plan">
        One plan per user per week. Trying to create a second one throws a
        constraint violation. The service layer uses
        {" "}<code>findByUserIdAndWeekStartDate(...).orElseGet(create)</code>{" "}
        to make this idempotent.
      </Callout>

      <Callout tone="ok" title="3. UNIQUE weekly_commit_id on reconciliation">
        A commit can be reconciled at most once. Enforced by a unique constraint
        on <code>reconciliation.weekly_commit_id</code> (which is also the FK).
      </Callout>

      <h2>Entity-by-entity, in reading order</h2>

      <h3>Team</h3>
      <p>
        A group of users. Owns Rally Cries. Optional <code>lead_user_id</code>.
        Defined in{" "}
        <FileRef path="apps/wc-backend/src/main/java/com/wc/domain/Team.java" />.
      </p>

      <h3>User (table is <code>app_user</code>)</h3>
      <p>
        Identity row. Carries <code>role</code>, <code>manager_id</code> (self-FK
        — see the People page),
        <code>team_id</code>, and <code>auth0_sub</code> for the JWT subject.
        Lazy-provisioned on first JWT (see Auth Flow).
      </p>

      <h3>RallyCry → DefiningObjective → Outcome</h3>
      <p>
        Three tables that form the strategy tree. <code>Outcome.parent_outcome_id</code>{" "}
        is a self-FK that lets a Supporting Outcome attach to another Outcome,
        so deeper hierarchies don't need a new join table. Outcome carries the
        actual numbers — <code>target_value</code>, <code>baseline_value</code>,
        <code>current_value</code>, <code>metric_type</code> (NUMBER / PERCENT /
        CURRENCY / BOOLEAN), and <code>priority_tier</code> (P0–P3).
      </p>

      <Callout tone="info" title="Why a P0/P1 distinction matters in code">
        Alignment percentage on a plan is calculated as
        {" "}<code>(commits linked to P0 or P1 outcomes) / total commits</code>.
        See <FileRef path="apps/wc-backend/src/main/java/com/wc/service/PlanService.java" line={142} />.
        The frontend renders this as a colored bar; lower than 40% goes red.
      </Callout>

      <h3>ChessTag</h3>
      <p>
        A lookup table seeded with three rows: <code>OFFENSE</code>,{" "}
        <code>DEFENSE</code>, <code>MAINTENANCE</code>. Stored as a table, not a
        Postgres enum, so labels can change without a schema migration.
        Optional FK from <code>weekly_commit.chess_tag_id</code>.
      </p>

      <h3>Plan</h3>
      <p>
        One per user per week. Carries the lifecycle <code>state</code> (see the
        Lifecycle page), timestamps for each transition, and the manager's
        signing identity once reconciliation is approved. The unique constraint
        is on <code>(user_id, week_start_date)</code>.
      </p>

      <h3>WeeklyCommit</h3>
      <p>
        The thing a person is committing to do this week. Title, optional
        description, planned effort hours, ordinal (for drag-to-reorder), a
        non-null FK to an Outcome, an optional ChessTag, and{" "}
        <code>carried_from_commit_id</code> — also a self-FK — for commits
        cloned out of the prior week's "MISSED" pile.
      </p>

      <h3>Reconciliation</h3>
      <p>
        A 1:0..1 sidecar on WeeklyCommit. Preserves the locked plan-of-record
        verbatim and writes the actual outcome alongside it. Status options:{" "}
        <code>DONE</code>, <code>PARTIAL</code>, <code>MISSED</code>,{" "}
        <code>DROPPED</code>, <code>ADDED</code>.
      </p>

      <Callout tone="info" title="Why a sidecar rather than mutating the commit">
        Mutating the commit would lose the original plan. Auditing what was
        planned vs. what actually happened is the whole point of the
        reconciliation phase, so the locked WeeklyCommit row stays as written
        and the Reconciliation row records reality.
      </Callout>

      <PageFooter prev={navLink("people")} next={navLink("lifecycle")} />
    </article>
  );
}
