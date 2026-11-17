import { createElement } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  prefersReducedMotion,
  useDelayedUnmount,
} from "@/components/rollcall/shared/use-motion";

function DelayedTestBox({
  present,
  exitMs = 140,
  reducedExitMs = 0,
}: {
  present: boolean;
  exitMs?: number;
  reducedExitMs?: number;
}) {
  const { isMounted, isExiting, onTransitionEnd } = useDelayedUnmount(
    present,
    exitMs,
    reducedExitMs,
  );
  if (!isMounted) return null;
  return createElement(
    "div",
    {
      "data-testid": "delayed-box",
      "data-exiting": isExiting ? "true" : "false",
      onTransitionEnd,
    },
    "Visible",
  );
}

describe("use-motion", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reads prefersReducedMotion safely when matchMedia is absent or matches", () => {
    expect(prefersReducedMotion()).toBe(false);

    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    expect(prefersReducedMotion()).toBe(true);
  });

  it("keeps element mounted through exitMs before unmounting", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      createElement(DelayedTestBox, { present: true, exitMs: 140 }),
    );
    expect(screen.getByTestId("delayed-box")).toHaveAttribute(
      "data-exiting",
      "false",
    );

    rerender(createElement(DelayedTestBox, { present: false, exitMs: 140 }));
    expect(screen.getByTestId("delayed-box")).toHaveAttribute(
      "data-exiting",
      "true",
    );

    act(() => {
      vi.advanceTimersByTime(139);
    });
    expect(screen.getByTestId("delayed-box")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("delayed-box")).not.toBeInTheDocument();
  });

  it("unmounts immediately when reduced motion is active and reducedExitMs is 0", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { rerender } = render(
      createElement(DelayedTestBox, {
        present: true,
        exitMs: 140,
        reducedExitMs: 0,
      }),
    );
    expect(screen.getByTestId("delayed-box")).toBeInTheDocument();

    rerender(
      createElement(DelayedTestBox, {
        present: false,
        exitMs: 140,
        reducedExitMs: 0,
      }),
    );
    expect(screen.queryByTestId("delayed-box")).not.toBeInTheDocument();
  });
});
