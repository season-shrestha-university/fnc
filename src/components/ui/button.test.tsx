import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button component", () => {
  it("renders children without loader when not pending", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button.querySelector(".animate-spin")).toBeNull();
  });

  it("renders a spinning loader and disables button when loading is true", () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByRole("button", { name: "Submit" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("data-loading");
    expect(button).toHaveAttribute("data-pending");

    const loader = button.querySelector(".animate-spin");
    expect(loader).not.toBeNull();
    expect(loader).toHaveAttribute("data-slot", "button-loader");
  });

  it("renders a spinning loader when pending is true", () => {
    render(<Button pending>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button.querySelector(".animate-spin")).not.toBeNull();
  });

  it("displays loadingText when provided during pending state", () => {
    render(
      <Button loading loadingText="Saving changes...">
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: /saving changes/i })).toBeInTheDocument();
    expect(screen.queryByText("Save")).toBeNull();
    const loader = screen.getByRole("button").querySelector(".animate-spin");
    expect(loader).not.toBeNull();
  });

  it("renders only the spinning loader for icon buttons in pending state", () => {
    render(
      <Button size="icon" loading aria-label="Settings">
        <span data-testid="icon-child">⚙</span>
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Settings" });
    expect(button).toBeDisabled();
    expect(screen.queryByTestId("icon-child")).toBeNull();
    expect(button.querySelector(".animate-spin")).not.toBeNull();
  });
});

