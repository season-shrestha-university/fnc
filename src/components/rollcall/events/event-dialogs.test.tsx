import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import EventDialogs from "./event-dialogs";

function renderEventDialogs(
  overrides: Partial<React.ComponentProps<typeof EventDialogs>> = {},
) {
  const props: React.ComponentProps<typeof EventDialogs> = {
    activeEvent: "Dashain",
    eventName: "Dashain",
    trackedFields: ["Name", "Member ID"],
    isEventOpen: true,
    isDeleteEventOpen: false,
    onEventOpenChange: vi.fn(),
    onDeleteOpenChange: vi.fn(),
    onEventNameChange: vi.fn(),
    onTrackedFieldsChange: vi.fn(),
    onSave: vi.fn(),
    onDeleteRequest: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };

  return { ...render(<EventDialogs {...props} />), props };
}

describe("EventDialogs", () => {
  it("requests confirmation before deleting an active event", () => {
    const { props, rerender } = renderEventDialogs();

    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));

    expect(props.onDeleteRequest).toHaveBeenCalledOnce();
    expect(props.onDelete).not.toHaveBeenCalled();

    rerender(
      <EventDialogs
        {...props}
        isEventOpen={false}
        isDeleteEventOpen
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));

    expect(props.onDelete).toHaveBeenCalledOnce();
  });

  it("shows spinning loader and disables button when isSaving is true", () => {
    renderEventDialogs({ isSaving: true });

    const submitButton = screen.getByRole("button", { name: /updating event/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute("aria-busy", "true");
    expect(submitButton.querySelector(".animate-spin")).not.toBeNull();
  });

  it("shows spinning loader and disables delete button when isDeleting is true", () => {
    renderEventDialogs({
      isEventOpen: false,
      isDeleteEventOpen: true,
      isDeleting: true,
    });

    const deleteButton = screen.getByRole("button", { name: /deleting event/i });
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute("aria-busy", "true");
    expect(deleteButton.querySelector(".animate-spin")).not.toBeNull();
  });

  it("binds eventDate and exposes all selectable tracked fields", () => {
    const onEventDateChange = vi.fn();
    const onTrackedFieldsChange = vi.fn();

    renderEventDialogs({
      eventDate: "2026-11-20",
      onEventDateChange,
      onTrackedFieldsChange,
    });

    const dateInput = screen.getByLabelText("Date");
    expect(dateInput).toHaveValue("2026-11-20");
    fireEvent.change(dateInput, { target: { value: "2026-11-25" } });
    expect(onEventDateChange).toHaveBeenCalledWith("2026-11-25");

    expect(screen.getByLabelText(/Name/)).toBeDisabled();
    expect(screen.getByLabelText(/Member ID/)).toBeDisabled();

    for (const field of ["Email", "Phone", "Address", "Date of birth", "Photo"]) {
      const checkbox = screen.getByLabelText(field);
      expect(checkbox).not.toBeDisabled();
    }

    fireEvent.click(screen.getByLabelText("Email"));
    expect(onTrackedFieldsChange).toHaveBeenCalledWith([
      "Name",
      "Member ID",
      "Email",
    ]);
  });
});
