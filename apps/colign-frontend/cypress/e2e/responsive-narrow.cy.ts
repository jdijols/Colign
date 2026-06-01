import {
  preflight,
  assertNoHorizontalScroll,
  assertTouchTargets,
} from "../support/responsive-assertions";

/**
 * Narrow viewport regression. In mock mode, RootGate routes / to the
 * WeeklyCommitApp remote (HostHome only renders under real Auth0). Ada
 * is pre-seeded with a team in the H2 demo profile, so the journey is:
 *   /login → click Ada → /weekly-plan (the IC's main screen).
 */
describe("Responsive @ 320×568 (narrow stress test)", () => {
  beforeEach(() => {
    preflight();
    cy.viewport(320, 568);
  });

  it("Landing at /", () => {
    cy.visit("/");
    assertNoHorizontalScroll();
    assertTouchTargets();
  });

  it("Login page", () => {
    cy.visit("/login");
    assertNoHorizontalScroll();
    assertTouchTargets();
  });

  it("Login → WeeklyPlanPage (seeded Ada with team)", () => {
    cy.visit("/login");
    cy.contains("button", /Ada — IC/i).click();
    cy.get('[data-cy="plan-heading"]', { timeout: 10000 }).should("be.visible");
    assertNoHorizontalScroll();
    assertTouchTargets();
  });
});
