Feature: Weekly commit lifecycle

  The brief's marquee functional requirement: an IC drafts a plan,
  submits it, reconciles every commit, and finalizes. A manager sees the
  reconciled plan on the team rollup. Structural alignment is the
  precondition for submission — the empty plan can't advance.

  Scenario: Empty-plan submit is blocked; a linked plan completes the cycle
    Given I am signed in as IC "ada@st6.dev"
    When I open the weekly plan
    Then the Submit plan button is disabled until at least one commit exists
    When I add a commit titled "Wire RCDO picker"
    And I submit the plan
    Then the plan state shows "Submitted"
    When I start reconciliation
    And I mark every commit as Done
    And I submit reconciliation
    Then the plan state shows "Reconciled"
    When I sign in as manager "manager@st6.dev" and open the team rollup
    Then I see "ada@st6.dev" on the team rollup with a high-priority alignment shown
