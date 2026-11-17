import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  WizardStepViewport,
  type WizardDirection,
} from "@/components/rollcall/shared/wizard-step-viewport";

describe("WizardStepViewport", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("exits outgoing step for 120ms before mounting incoming step with direction", () => {
    vi.useFakeTimers();
    const onStepVisible = vi.fn();
    const { rerender } = render(
      <WizardStepViewport
        stepKey="step1"
        direction="forward"
        onStepVisible={onStepVisible}
      >
        {(step) => <div>{step === "step1" ? "First step" : "Second step"}</div>}
      </WizardStepViewport>,
    );

    expect(screen.getByText("First step")).toBeInTheDocument();

    rerender(
      <WizardStepViewport
        stepKey="step2"
        direction="forward"
        onStepVisible={onStepVisible}
      >
        {(step) => <div>{step === "step1" ? "First step" : "Second step"}</div>}
      </WizardStepViewport>,
    );

    // Outgoing step remains mounted during 120ms exit
    const panel = document.querySelector(".step-panel");
    expect(panel).toHaveAttribute("data-direction", "forward");
    expect(panel).toHaveAttribute("data-state", "exiting");
    expect(screen.getByText("First step")).toBeInTheDocument();
    expect(screen.queryByText("Second step")).not.toBeInTheDocument();

    // After 120ms, incoming step mounts and never overlaps outgoing
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(screen.queryByText("First step")).not.toBeInTheDocument();
    expect(screen.getByText("Second step")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(onStepVisible).toHaveBeenCalledWith("step2");

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(document.querySelector(".step-panel")).toHaveAttribute(
      "data-state",
      "idle",
    );
  });

  it("tracks back direction when navigating backward", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <WizardStepViewport stepKey="step2" direction="forward">
        {(step) => <div>{step}</div>}
      </WizardStepViewport>,
    );

    rerender(
      <WizardStepViewport stepKey="step1" direction={"back" as WizardDirection}>
        {(step) => <div>{step}</div>}
      </WizardStepViewport>,
    );

    expect(document.querySelector(".step-panel")).toHaveAttribute(
      "data-direction",
      "back",
    );
    expect(document.querySelector(".step-panel")).toHaveAttribute(
      "data-state",
      "exiting",
    );

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByText("step1")).toBeInTheDocument();
  });
});
