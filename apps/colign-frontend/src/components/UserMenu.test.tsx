import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/render";

const hoisted = vi.hoisted(() => ({ onSignOut: vi.fn() }));

import { UserMenu } from "./UserMenu";

describe("UserMenu", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  function renderMenu() {
    return renderWithRouter(
      <UserMenu
        email="jason@colign.org"
        role="MANAGER"
        avatarUrl={null}
        displayName="Jason D"
        onSignOut={hoisted.onSignOut}
      />,
    );
  }

  it("renders the trigger with an initial fallback when avatarUrl is null", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: /account menu/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain("J");
  });

  it("does not render the menu until the trigger is clicked", () => {
    renderMenu();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the menu with email + role header on click", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("jason@colign.org")).toBeInTheDocument();
    expect(screen.getByText(/manager/i)).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onSignOut when Sign out is clicked", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));
    expect(hoisted.onSignOut).toHaveBeenCalledOnce();
  });
});
