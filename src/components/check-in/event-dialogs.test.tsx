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
});
