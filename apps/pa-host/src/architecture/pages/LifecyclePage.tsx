import { Mermaid } from "../Mermaid";
import { Callout } from "../components/Callout";
import { Code } from "../components/Code";
import { FileRef } from "../components/FileRef";
import { PageFooter } from "../components/PageFooter";
import { navLink } from "../nav";

const STATE_MACHINE = `
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> LOCKED: PATCH /plans/{id}/lock<br/>(must have >=1 commit)
  LOCKED --> RECONCILING: PATCH /plans/{id}/start-reconciliation
  RECONCILING --> RECONCILED: PATCH /plans/{id}/finalize-reconciliation<br/>(every commit reconciled)
  RECONCILED --> CARRIED_FORWARD: automatic<br/>(if MISSED commits exist)
  RECONCILED --> [*]
  CARRIED_FORWARD --> [*]

  note left of DRAFT
    Commits can be added,
    edited, deleted.
  end note

  note right of LOCKED
    Commits are immutable.
    Plan of record.
  end note

  note right of RECONCILING
    Per-commit reconciliation
    rows can be written.
  end note
`.trim();

const CARRY_FORWARD = `
sequenceDiagram
  participant IC
  participant API as wc-backend
  participant DB as Postgres

  IC->>API: PATCH /plans/{thisWeek}/finalize-reconciliation
  API->>DB: SELECT all commits + reconciliations for thisWeek
  Note over API: All commits reconciled? If not → 409.
  API->>DB: UPDATE plan SET state='RECONCILED', reconciled_at=now()
  API->>DB: SELECT commits WHERE status='MISSED'
  Note over API: Find or create next week's plan in DRAFT
  API->>DB: INSERT clone of each MISSED commit<br/>(carried_from_commit_id = original)
  API->>IC: return RECONCILED plan
`.trim();

export function LifecyclePage() {
  return (
    <article>
      <h1>The Weekly Lifecycle</h1>
      <p className="arch-lead">
        A <code>Plan</code> moves through five states. Each transition is a
        specific endpoint with specific guards. The state machine is enforced in
        the service layer — illegal transitions throw{" "}
        <code>IllegalTransitionException</code> and the global handler turns
        them into <code>409 Conflict</code>.
      </p>

      <h2>The states</h2>

      <Mermaid
        chart={STATE_MACHINE}
        caption="DRAFT → LOCKED → RECONCILING → RECONCILED → CARRIED_FORWARD. Each transition is an explicit HTTP call."
      />

      <table className="arch-table">
        <thead>
          <tr>
            <th>State</th>
            <th>What's true</th>
            <th>What you can do</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>DRAFT</code></td>
            <td>The plan exists, the week hasn't started (or has, but isn't locked).</td>
            <td>Add, edit, delete commits. Lock when ready.</td>
          </tr>
          <tr>
            <td><code>LOCKED</code></td>
            <td>The plan of record. Commits are immutable.</td>
            <td>Wait for the week to end. Start reconciliation.</td>
          </tr>
          <tr>
            <td><code>RECONCILING</code></td>
            <td>The week is over. The IC is filling out actuals.</td>
            <td>Write one Reconciliation row per commit. Finalize when done.</td>
          </tr>
          <tr>
            <td><code>RECONCILED</code></td>
            <td>The IC submitted. Manager has approved (signed-off in v1 is on the manager_signed_* columns).</td>
            <td>Terminal — unless MISSED commits exist, see below.</td>
          </tr>
          <tr>
            <td><code>CARRIED_FORWARD</code></td>
            <td>The plan was reconciled and MISSED commits were cloned into next week's DRAFT plan.</td>
            <td>Read-only history.</td>
          </tr>
        </tbody>
      </table>

      <h2>Guards — what stops an illegal transition</h2>

      <Callout tone="warn" title="You cannot LOCK an empty plan">
        Enforced in <FileRef path="apps/wc-backend/src/main/java/com/wc/service/PlanService.java" line={89} />:
        <Code>{`if (n == 0) {
    throw new IllegalTransitionException(
        PlanState.DRAFT, PlanState.LOCKED,
        "cannot lock an empty plan");
}`}</Code>
      </Callout>

      <Callout tone="warn" title="You cannot FINALIZE if any commit is unreconciled">
        Enforced in <FileRef path="apps/wc-backend/src/main/java/com/wc/service/ReconciliationService.java" line={106} />:
        <Code>{`boolean fullyReconciled = all.stream().allMatch(c ->
        reconciliations.findByWeeklyCommitId(c.getId()).isPresent());
if (!fullyReconciled) {
    throw new IllegalTransitionException(...,
        "every commit must be reconciled before finalizing");
}`}</Code>
      </Callout>

      <Callout tone="warn" title="You cannot add/edit/delete commits unless DRAFT">
        Enforced in <FileRef path="apps/wc-backend/src/main/java/com/wc/controller/WeeklyCommitController.java" line={47} />.
        Locked plans are intentionally immutable so a manager sees what was
        committed, not what was edited later.
      </Callout>

      <h2>How carry-forward works</h2>
      <p>
        When a plan is finalized, any commit whose reconciled status maps to a
        MISSED outcome gets cloned into the next week's DRAFT plan. The new
        commit is a fresh row, but it carries{" "}
        <code>carried_from_commit_id</code> pointing back at the original so the
        UI can show the "carried over" badge.
      </p>

      <Mermaid chart={CARRY_FORWARD} caption="One atomic transaction." />

      <p>
        The cloning loop is in{" "}
        <FileRef path="apps/wc-backend/src/main/java/com/wc/service/ReconciliationService.java" line={144} />:
      </p>
      <Code>{`for (int i = 0; i < toCarry.size(); i++) {
    WeeklyCommit src = toCarry.get(i);
    commits.save(WeeklyCommit.builder()
            .planId(nextPlan.getId())
            .outcomeId(src.getOutcomeId())
            .chessTagId(src.getChessTagId())
            .title(src.getTitle())
            .description(src.getDescription())
            .plannedEffortHours(src.getPlannedEffortHours())
            .status(CommitStatus.CARRIED)
            .ordinal(baseOrdinal + i)
            .carriedFromCommitId(src.getId())
            .build());
}`}</Code>

      <Callout tone="info" title="A subtle edge case the code handles">
        If next week's plan already exists and is past DRAFT (rare, but possible
        if an IC plans ahead aggressively), the carry-forward step bails
        silently rather than inserting into a locked plan. See line 138 of the
        same file.
      </Callout>

      <h2>Where to find the lifecycle in code</h2>
      <ul>
        <li>
          <strong>The state enum:</strong>{" "}
          <FileRef path="apps/wc-backend/src/main/java/com/wc/domain/PlanState.java" />
        </li>
        <li>
          <strong>DRAFT → LOCKED guard:</strong>{" "}
          <FileRef path="apps/wc-backend/src/main/java/com/wc/service/PlanService.java" line={83} />
        </li>
        <li>
          <strong>LOCKED → RECONCILING guard:</strong>{" "}
          <FileRef path="apps/wc-backend/src/main/java/com/wc/service/ReconciliationService.java" line={47} />
        </li>
        <li>
          <strong>RECONCILING → RECONCILED + carry-forward:</strong>{" "}
          <FileRef path="apps/wc-backend/src/main/java/com/wc/service/ReconciliationService.java" line={98} />
        </li>
      </ul>

      <PageFooter prev={navLink("data")} next={navLink("routes")} />
    </article>
  );
}
