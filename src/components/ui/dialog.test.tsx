import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./dialog";

describe("Dialog component", () => {
  it("renders Shorelines backdrop and lift-fade dialog without zoom-in-95", () => {
    render(
      <Dialog open>
        <DialogContent mobileSheet>
          <DialogTitle>Edit item</DialogTitle>
          <DialogDescription>Details</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("ui-dialog");
    expect(dialog.className).toContain("ui-dialog-responsive-sheet");
    expect(dialog.className).not.toContain("zoom-in-95");

    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.className).toContain("ui-backdrop");
  });
});
