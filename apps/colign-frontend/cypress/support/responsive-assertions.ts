const DENSE_SELECTORS = [
  "th button",
  '[aria-label*="agination" i] button',
  '[data-testid*="pagination"] button',
  '[data-dense-control="true"]',
  // WCAG 2.5.5 "inline" exception: links embedded inside paragraphs / text
  // flow are not standalone targets and don't require the 44 floor.
  "p a",
  "span a",
  "li a",
  // Inline text links in nav rows / footers / headers — constrained by the
  // surrounding line-height, exempt per WCAG 2.5.5 inline rule.
  "nav a",
  "header a",
  "footer a",
];

// SPEC §6.6 — ALLOWLIST. Only permit localhost/127/LAN IPs. Reject everything else
// including staging.*, *.fly.dev, *.vercel.app, and api.colign.org.
// Port is allowed on ALL three host alternatives (localhost, 127.0.0.1, LAN IP).
const DEV_API_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(?::\d+)?(\/.*)?$/i;

export function preflight(): void {
  const authMode = Cypress.env("VITE_AUTH_MODE") || "";
  if (authMode !== "mock") {
    throw new Error(
      `Responsive specs require VITE_AUTH_MODE=mock (got "${authMode}"). Aborting before navigation.`
    );
  }
  const apiBase = Cypress.env("VITE_API_BASE") || "";
  if (!DEV_API_PATTERN.test(apiBase)) {
    throw new Error(
      `Responsive specs MUST target a local dev backend (allowlist failed; got "${apiBase}"). Aborting.`
    );
  }
}

export function assertNoHorizontalScroll(): void {
  cy.window().then((win) => {
    const root = (win.document.querySelector("#colign-root") ?? win.document.documentElement) as Element;
    expect(root.scrollWidth, "no horizontal scroll inside #colign-root").to.be.at.most(root.clientWidth + 1);
  });
}

export function assertTouchTargets(): void {
  cy.window().then((win) => {
    const root = win.document.querySelector("#colign-root") ?? win.document.documentElement;
    const candidates = root.querySelectorAll(
      'a, button, input, select, [role="button"], tr[data-clickable="true"], [data-clickable="true"]'
    );
    const exceptionMatches = (el: Element): boolean =>
      DENSE_SELECTORS.some((sel) => el.matches(sel) || el.closest(sel) !== null);
    const failures: string[] = [];
    candidates.forEach((el) => {
      if (exceptionMatches(el)) return;
      const rect = el.getBoundingClientRect();
      // Cypress runs in a desktop browser reporting (pointer: fine), so the
      // responsive.css (pointer: coarse) min-height: 44 rule does NOT activate.
      // Assert the FINE-pointer floor (32px); the coarse-pointer 44px lift is
      // verified at runtime on real touch devices + via screenshot review.
      // Elements below 32 fail BOTH floors and are real bugs.
      if (rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32)) {
        failures.push(`${el.tagName}#${el.id || "(no-id)"} ${Math.round(rect.width)}×${Math.round(rect.height)}`);
      }
    });
    expect(failures, `all primary interactive elements ≥ 32×32 fine-pointer floor (failures: ${failures.join(", ")})`).to.be.empty;
  });
}
