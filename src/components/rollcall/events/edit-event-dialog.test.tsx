import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EditEventDialog, type EditableEvent } from "./edit-event-dialog";

const sampleEvent: EditableEvent = {
  id: "evt-1",
  name: "Community Lunch",
  eventDate: "2026-11-17",
  trackedFields: ["Name", "Member ID"],
};

function renderEditDialog(
  overrides: Partial<React.ComponentProps<typeof EditEventDialog>> = {},
) {
  const props: React.ComponentProps<typeof EditEventDialog> = {
    open: true,
    event: sampleEvent,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { ...render(<EditEventDialog {...props} />), props };
}

describe("EditEventDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens on Basics with Save disabled and closes immediately when clean", () => {
    const { props } = renderEditDialog();

    expect(screen.getByText("Edit event")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Basics" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("dots only dirty tab, saves from Basics when only Phone changed, and clears dots on revert", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { props } = renderEditDialog({ onSave });

    fireEvent.click(screen.getByRole("tab", { name: "Check-in fields" }));
    fireEvent.click(screen.getByRole("button", { name: "Phone" }));

    const fieldsTab = screen.getByRole("tab", { name: /Check-in fields/i });
    const basicsTab = screen.getByRole("tab", { name: /Basics/i });
    expect(
      within(fieldsTab).getByLabelText("Unsaved changes"),
    ).toBeInTheDocument();
    expect(
      within(basicsTab).queryByLabelText("Unsaved changes"),
    ).not.toBeInTheDocument();

    fireEvent.click(basicsTab);
    expect(
      within(fieldsTab).getByLabelText("Unsaved changes"),
    ).toBeInTheDocument();
    const saveButton = screen.getByRole("button", { name: "Save changes" });
    expect(saveButton).not.toBeDisabled();

    // Revert Phone back to snapshot
    fireEvent.click(fieldsTab);
    fireEvent.click(screen.getByRole("button", { name: "Phone" }));
    expect(
      within(fieldsTab).queryByLabelText("Unsaved changes"),
    ).not.toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    // Toggle Phone back on, return to Basics, and save
    fireEvent.click(screen.getByRole("button", { name: "Phone" }));
    fireEvent.click(basicsTab);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        id: "evt-1",
        name: "Community Lunch",
        eventDate: "2026-11-17",
        trackedFields: ["Name", "Member ID", "Phone"],
      });
    });
    expect(props.onClose).toHaveBeenCalled();
  });

  it("shows immediate inline error when Name is emptied and re-enables Save on restore", async () => {
    renderEditDialog();

    const nameInput = screen.getByLabelText(/Event name/i);
    fireEvent.change(nameInput, { target: { value: "   " } });

    expect(screen.getByText("Give the event a name")).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: "Saturday Lunch" } });
    await waitFor(() => {
      expect(
        screen.queryByText("Give the event a name"),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).not.toBeDisabled();
  });

  it("shows Delete event only on Basics, opens sheet over edit dialog, and handles cancel vs deleting", async () => {
    let resolveDelete!: () => void;
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    renderEditDialog({ onDelete });

    expect(
      screen.getByRole("button", { name: "Delete event" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Check-in fields" }));
    expect(
      screen.queryByRole("button", { name: "Delete event" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Basics" }));
    fireEvent.change(screen.getByLabelText(/Event name/i), {
      target: { value: "Edited Lunch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));

    const alert = screen.getByRole("alertdialog");
    expect(
      within(alert).getByText("Delete Community Lunch?"),
    ).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Event name/i)).toHaveValue("Edited Lunch");

    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));
    const confirmAlert = screen.getByRole("alertdialog");
    fireEvent.click(
      within(confirmAlert).getByRole("button", { name: "Delete event" }),
    );

    expect(
      within(confirmAlert).getByRole("button", { name: /Deleting event/i }),
    ).toBeDisabled();
    expect(
      within(confirmAlert).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled();
    expect(onDelete).toHaveBeenCalledWith("evt-1");

    resolveDelete();
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  it("prompts Discard changes on Esc when dirty and returns to form on Esc", () => {
    const { props } = renderEditDialog();

    fireEvent.change(screen.getByLabelText(/Event name/i), {
      target: { value: "Updated Lunch" },
    });
    fireEvent.keyDown(window, { key: "Escape" });

    const alert = screen.getByRole("alertdialog");
    expect(within(alert).getByText("Discard changes?")).toBeInTheDocument();
    expect(
      within(alert).getByText(
        "You have unsaved edits for Community Lunch. Closing now will lose them.",
      ),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Event name/i)).toHaveValue("Updated Lunch");
    expect(props.onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("allows changing the event date via the shadcn calendar picker while editing", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { props } = renderEditDialog({ onSave });

    fireEvent.click(screen.getByLabelText("Date"));
    const grid = await screen.findByRole("grid");
    const dayButton = grid.querySelector(
      '[data-day="2026-11-20"] button',
    ) as HTMLButtonElement;
    expect(dayButton).toBeTruthy();
    fireEvent.click(dayButton);

    expect(screen.getByLabelText("Date")).toHaveTextContent("20 Nov 2026");
    const basicsTab = screen.getByRole("tab", { name: /Basics/i });
    expect(
      within(basicsTab).getByLabelText("Unsaved changes"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        id: "evt-1",
        name: "Community Lunch",
        eventDate: "2026-11-20",
        trackedFields: ["Name", "Member ID"],
      });
    });
    expect(props.onClose).toHaveBeenCalled();
  });
});
