import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button component", () => {
  it("renders children without pending state when not pending", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button.querySelector(".animate-spin")).toBeNull();
    expect(button.className).toContain("scale-[var(--motion-scale-press)]");
  });

  it("disables button and uses non-spinning pending state when loading is true", () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByRole("button", { name: "Submit" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("data-loading");
    expect(button).toHaveAttribute("data-pending");
    expect(button.querySelector(".animate-spin")).toBeNull();
    expect(
      button.querySelector('[data-slot="button-pending"]'),
    ).toBeInTheDocument();
  });

  it("marks button busy without spinning loader when pending is true", () => {
    render(<Button pending>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button.querySelector(".animate-spin")).toBeNull();
  });

  it("displays loadingText without spinning loader during pending state", () => {
    render(
      <Button loading loadingText="Saving changes…">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: /saving changes/i });
    expect(button).toBeInTheDocument();
    expect(screen.queryByText("Save")).toBeNull();
    expect(button.querySelector(".animate-spin")).toBeNull();
  });

  it("replaces icon child with static ellipsis for icon buttons in pending state", () => {
    render(
      <Button size="icon" loading aria-label="Settings">
        <span data-testid="icon-child">⚙</span>
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Settings" });
    expect(button).toBeDisabled();
    expect(screen.queryByTestId("icon-child")).toBeNull();
    expect(button.querySelector(".animate-spin")).toBeNull();
    expect(button).toHaveTextContent("…");
  });
});
