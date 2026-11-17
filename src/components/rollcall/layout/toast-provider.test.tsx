import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ToastProvider,
  useDoorSheet,
  useToast,
} from "@/components/rollcall/layout/toast-provider";

function Harness({ onUndo }: { onUndo?: () => void }) {
  const showToast = useToast();
  const { showDoorSheet } = useDoorSheet();

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          showDoorSheet({
            variant: "success",
            title: "Checked in",
            member: {
              id: "MEM-1",
              name: "Ada Lovelace",
              initials: "AL",
            },
            onUndo,
          })
        }
      >
        Success scan
      </button>
      <button
        type="button"
        onClick={() =>
          showDoorSheet({
            variant: "duplicate",
            title: "Already checked in",
            subtitle: "Ada Lovelace",
          })
        }
      >
        Duplicate scan
      </button>
      <button
        type="button"
        onClick={() =>
          showDoorSheet({
            variant: "error",
            title: "Member not found",
            subtitle: "NOPE-99",
          })
        }
      >
        Error scan
      </button>
      <button type="button" onClick={() => showToast("First toast", "success")}>
        Toast 1
      </button>
      <button type="button" onClick={() => showToast("Second toast", "info")}>
        Toast 2
      </button>
    </div>
  );
}

describe("ToastProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("opens success door sheet, starts 2000ms hold after 320ms enter, and handles Undo", () => {
    vi.useFakeTimers();
    const onUndo = vi.fn();
    render(
      <ToastProvider>
        <Harness onUndo={onUndo} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Success scan" }));
    const sheet = screen.getByTestId("scan-toast");
    expect(sheet).toHaveAttribute("data-variant", "success");
    expect(sheet.querySelector(".tick-path")).not.toBeNull();
    expect(sheet.querySelector(".hold-bar")).not.toBeNull();

    // Enter (320ms + 1 frame) -> holding
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.getByTestId("scan-toast")).toHaveAttribute(
      "data-state",
      "holding",
    );

    // Undo cancels timer, invokes callback, and exits after 224ms
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("scan-toast")).toHaveAttribute(
      "data-state",
      "exiting",
    );

    act(() => {
      vi.advanceTimersByTime(224);
    });
    expect(screen.queryByTestId("scan-toast")).not.toBeInTheDocument();
  });

  it("auto-dismisses duplicate/error door sheets after 3000ms post-enter", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Duplicate scan" }));
    const sheet = screen.getByTestId("scan-toast");
    expect(sheet).toHaveAttribute("data-variant", "duplicate");
    expect(sheet).toHaveTextContent("Already checked in");
    expect(sheet.querySelector(".tick-path")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(350 + 2999);
    });
    expect(screen.getByTestId("scan-toast")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1 + 224);
    });
    expect(screen.queryByTestId("scan-toast")).not.toBeInTheDocument();
  });

  it("replaces top non-door toast sequentially after 140ms exit", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Toast 1" }));
    expect(screen.getByTestId("top-toast")).toHaveTextContent("First toast");

    fireEvent.click(screen.getByRole("button", { name: "Toast 2" }));
    expect(screen.getByTestId("top-toast")).toHaveAttribute(
      "data-state",
      "exiting",
    );

    act(() => {
      vi.advanceTimersByTime(140);
    });
    expect(screen.getByTestId("top-toast")).toHaveTextContent("Second toast");
  });
});
