import {
  preflight,
  assertNoHorizontalScroll,
  assertTouchTargets,
} from "../support/responsive-assertions";

describe("Responsive @ 1440×900 (desktop target)", () => {
  beforeEach(() => {
    preflight();
    cy.viewport(1440, 900);
  });

  it("HostHome → Login → OnboardingChoice → InviteTeammates → WeeklyPlan", () => {
    cy.visit("/");
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.get('[data-cy="landing-get-started"]').click();
    cy.findByRole("button", { name: /sign in/i }).click();
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.findByRole("button", { name: /create a team/i }).click();
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.findByRole("link", { name: /skip/i }).click();
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.findByRole("heading", { name: /this week/i, level: 1 }).should("be.visible");
    assertNoHorizontalScroll();
    assertTouchTargets();
  });
});
