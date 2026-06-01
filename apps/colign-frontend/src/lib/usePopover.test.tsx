import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePopover } from "./usePopover";

// Thin component wrapper — the hook is meant to be used inside a component, so
// we test it through that path rather than via renderHook.
function Harness() {
  const { open, setOpen, triggerRef, panelRef } = usePopover<HTMLButtonElement, HTMLDivElement>();
  return (
    <>
      <button ref={triggerRef} data-testid="trigger" onClick={() => setOpen((o) => !o)}>
        Toggle
      </button>
      {open && (
        <div ref={panelRef} data-testid="panel" role="menu">
          panel
        </div>
      )}
      <button data-testid="outside">Outside</button>
    </>
  );
}

describe("usePopover", () => {
  afterEach(() => cleanup());

  it("starts closed and toggles open on trigger click", async () => {
    render(<Harness />);
    expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("trigger"));
    expect(screen.getByTestId("panel")).toBeInTheDocument();
  });

  it("Esc closes an open popover", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId("trigger"));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
  });

  it("mousedown outside the panel closes the popover", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId("trigger"));
    expect(screen.getByTestId("panel")).toBeInTheDocument();
    // userEvent.click does a mousedown + mouseup; the mousedown alone triggers close.
    await userEvent.click(screen.getByTestId("outside"));
    expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
  });

  it("mousedown inside the panel does not close it", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId("trigger"));
    await userEvent.click(screen.getByTestId("panel"));
    expect(screen.getByTestId("panel")).toBeInTheDocument();
  });

  it("returns focus to the trigger when closed via Escape", async () => {
    render(<Harness />);
    const trigger = screen.getByTestId("trigger");
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });
});
