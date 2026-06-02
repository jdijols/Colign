import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithRouter } from "@/test/render";
import { NavRail } from "./NavRail";

describe("NavRail", () => {
  afterEach(() => cleanup());

  // AE1: role-gating of the Team route.
  it("Covers AE1. hides the Team link for IC role", () => {
    renderWithRouter(<NavRail role="IC" />);
    expect(screen.queryByRole("link", { name: /team/i })).not.toBeInTheDocument();
  });

  it("Covers AE1. shows the Team link for MANAGER role", () => {
    renderWithRouter(<NavRail role="MANAGER" />);
    expect(screen.getByRole("link", { name: /team/i })).toBeInTheDocument();
  });

  it("Covers AE1. shows the Team link for ADMIN role", () => {
    renderWithRouter(<NavRail role="ADMIN" />);
    expect(screen.getByRole("link", { name: /team/i })).toBeInTheDocument();
  });

  it("renders all tabs in fixed order for MANAGER (Team last)", () => {
    renderWithRouter(<NavRail role="MANAGER" />);
    const links = screen.getAllByRole("link").map((el) => el.textContent?.trim());
    expect(links).toEqual(["Dashboard", "Goals", "Commits", "Plan", "Reconcile", "Team"]);
  });

  it("renders the ungated tabs for IC, no Team", () => {
    renderWithRouter(<NavRail role="IC" />);
    const links = screen.getAllByRole("link").map((el) => el.textContent?.trim());
    expect(links).toEqual(["Dashboard", "Goals", "Commits", "Plan", "Reconcile"]);
  });

  it("shows Dashboard / Goals / Commits for every role (timeline flag on)", () => {
    renderWithRouter(<NavRail role="IC" />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /goals/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /commits/i })).toBeInTheDocument();
  });

  it("hides Dashboard / Goals / Commits when showTimelineTabs is false (prod)", () => {
    renderWithRouter(<NavRail role="MANAGER" showTimelineTabs={false} />);
    const links = screen.getAllByRole("link").map((el) => el.textContent?.trim());
    expect(links).toEqual(["Plan", "Reconcile", "Team"]);
  });

  // showTeam prop: AppShell passes canManageTeam(me, team) so a solo team lead
  // (a derived IC with no reports yet) also gets the Team rollup entry.
  it("shows the Team link for an IC when showTeam is true (solo team lead)", () => {
    renderWithRouter(<NavRail role="IC" showTeam />);
    expect(screen.getByRole("link", { name: /team/i })).toBeInTheDocument();
  });

  it("hides the Team link for an IC when showTeam is false", () => {
    renderWithRouter(<NavRail role="IC" showTeam={false} />);
    expect(screen.queryByRole("link", { name: /team/i })).not.toBeInTheDocument();
  });

  it("explicit showTeam={false} overrides the MANAGER role fallback", () => {
    renderWithRouter(<NavRail role="MANAGER" showTeam={false} />);
    expect(screen.queryByRole("link", { name: /team/i })).not.toBeInTheDocument();
  });

  it("renders all tabs incl. Team for an IC lead when showTeam is true", () => {
    renderWithRouter(<NavRail role="IC" showTeam />);
    const links = screen.getAllByRole("link").map((el) => el.textContent?.trim());
    expect(links).toEqual(["Dashboard", "Goals", "Commits", "Plan", "Reconcile", "Team"]);
  });

  it("does NOT render a Settings link in the rail — that lives in the user-chip popover", () => {
    renderWithRouter(<NavRail role="MANAGER" />);
    expect(screen.queryByRole("link", { name: /settings/i })).not.toBeInTheDocument();
  });

  it("exposes data-cy selectors on every route link", () => {
    renderWithRouter(<NavRail role="MANAGER" />);
    expect(document.querySelector('[data-cy="sidebar-dashboard"]')).toBeTruthy();
    expect(document.querySelector('[data-cy="sidebar-goals"]')).toBeTruthy();
    expect(document.querySelector('[data-cy="sidebar-commits"]')).toBeTruthy();
    expect(document.querySelector('[data-cy="sidebar-plan"]')).toBeTruthy();
    expect(document.querySelector('[data-cy="sidebar-reconcile"]')).toBeTruthy();
    expect(document.querySelector('[data-cy="sidebar-team"]')).toBeTruthy();
  });
});
