import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/render";
import { UserChip } from "./UserChip";

const baseProps = {
  email: "jason@colign.org",
  role: "MANAGER" as const,
  avatarUrl: null,
  displayName: "Jason D",
};

describe("UserChip", () => {
  afterEach(() => cleanup());

  it("renders the trigger with name + role badge + initial fallback", () => {
    renderWithRouter(<UserChip {...baseProps} onSignOut={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /account menu/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain("J");
    expect(trigger.textContent).toContain("Jason D");
    expect(trigger.textContent?.toLowerCase()).toContain("manager");
  });

  it("does not render the popover until the chip is clicked", () => {
    renderWithRouter(<UserChip {...baseProps} onSignOut={vi.fn()} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  // AE3: clicking the user chip opens a popover containing exactly Theme + Sign out;
  // Esc dismisses.
  it("Covers AE3. opens with Theme + Sign out, closes on Escape", async () => {
    renderWithRouter(<UserChip {...baseProps} onSignOut={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    const panel = screen.getByRole("menu");
    expect(panel).toBeInTheDocument();
    expect(panel.textContent).toMatch(/theme/i);
    expect(panel.textContent).toMatch(/sign out/i);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onSignOut when Sign out is clicked and closes the popover", async () => {
    const onSignOut = vi.fn();
    renderWithRouter(<UserChip {...baseProps} onSignOut={onSignOut} />);
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("falls back to the email initial when displayName is empty", () => {
    renderWithRouter(<UserChip {...baseProps} displayName="" onSignOut={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /account menu/i });
    expect(trigger.textContent).toContain("J");
  });
});
