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
