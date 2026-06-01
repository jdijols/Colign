import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/render";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("renders nothing when closed", () => {
    renderWithRouter(
      <ConfirmDialog open={false} onCancel={() => {}} onConfirm={() => {}} title="x" body="b" confirmLabel="Yes" />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog with title + body when open", () => {
    renderWithRouter(
      <ConfirmDialog open={true} onCancel={() => {}} onConfirm={() => {}} title="Remove?" body="Are you sure?" confirmLabel="Remove" />,
    );
    const dialog = screen.getByRole("dialog", { name: /remove\?/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("calls onConfirm when Confirm clicked", async () => {
    const onConfirm = vi.fn();
    renderWithRouter(
      <ConfirmDialog open={true} onCancel={() => {}} onConfirm={onConfirm} title="x" body="b" confirmLabel="Yes" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel on Escape", async () => {
    const onCancel = vi.fn();
    renderWithRouter(
      <ConfirmDialog open={true} onCancel={onCancel} onConfirm={() => {}} title="x" body="b" confirmLabel="Yes" />,
    );
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });
});
