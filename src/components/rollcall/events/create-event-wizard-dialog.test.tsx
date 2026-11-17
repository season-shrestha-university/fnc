import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentDate } from "@/lib/date";
import { formatEventDate } from "./event-form-types";
import { CreateEventWizardDialog } from "./create-event-wizard-dialog";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function renderCreateWizard(
  overrides: Partial<
    React.ComponentProps<typeof CreateEventWizardDialog>
  > = {},
) {
  const props: React.ComponentProps<typeof CreateEventWizardDialog> = {
    open: true,
    onClose: vi.fn(),
    onCreate: vi.fn().mockResolvedValue("evt-123"),
    onBackToEvents: vi.fn(),
    ...overrides,
  };
  return { ...render(<CreateEventWizardDialog {...props} />), props };
}

describe("CreateEventWizardDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults date to today and validates empty event name on Next", () => {
    renderCreateWizard();

    expect(screen.getByText("Create event")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveTextContent(
      formatEventDate(getCurrentDate()),
    );

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    expect(screen.getByText("Give the event a name")).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Event name/i);
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveFocus();

    fireEvent.change(nameInput, { target: { value: "Community Lunch" } });
    expect(screen.queryByText("Give the event a name")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(
      screen.getByText("What should we record at the door?"),
    ).toBeInTheDocument();
  });

  it("preserves optional toggles when navigating back and forward, and creates event", async () => {
    const onCreate = vi.fn().mockResolvedValue("evt-999");
    const { props } = renderCreateWizard({ onCreate });

    fireEvent.change(screen.getByLabelText(/Event name/i), {
      target: { value: "  Dashain Festival  " },
    });
    const today = getCurrentDate();
    const targetDay = today.endsWith("-25") ? 24 : 25;
    const expectedDate = `${today.slice(0, 8)}${String(targetDay).padStart(2, "0")}`;
    fireEvent.click(screen.getByLabelText("Date"));
    const grid = await screen.findByRole("grid");
    const dayButton = grid.querySelector(
      `[data-day="${expectedDate}"] button`,
    ) as HTMLButtonElement;
    expect(dayButton).toBeTruthy();
    fireEvent.click(dayButton);
    expect(screen.getByLabelText("Date")).toHaveTextContent(
      formatEventDate(expectedDate),
    );
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    expect(screen.getAllByText("Always recorded")).toHaveLength(2);
    const emailToggle = screen.getByRole("button", { name: "Email" });
    expect(emailToggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(emailToggle);
    expect(emailToggle).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText(/Event name/i)).toHaveValue(
      "  Dashain Festival  ",
    );

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByRole("button", { name: "Email" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        name: "Dashain Festival",
        eventDate: expectedDate,
        trackedFields: ["Name", "Member ID", "Email"],
      });
    });

    expect(
      await screen.findByRole("button", { name: "Start check-in" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start check-in" }));
    expect(props.onClose).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/events/evt-999/check-in");
  });

  it("supports Back to events exit from Done screen", async () => {
    const { props } = renderCreateWizard();

    fireEvent.change(screen.getByLabelText(/Event name/i), {
      target: { value: "Yoga" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    expect(
      await screen.findByRole("button", { name: "Start check-in" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to events" }));

    expect(props.onClose).toHaveBeenCalled();
    expect(props.onBackToEvents).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("blocks dismissal while submitting and preserves values on server error", async () => {
    let rejectCreate!: (reason?: unknown) => void;
    const onCreate = vi.fn(
      () =>
        new Promise<string>((_resolve, reject) => {
          rejectCreate = reject;
        }),
    );
    const { props } = renderCreateWizard({ onCreate });

    fireEvent.change(screen.getByLabelText(/Event name/i), {
      target: { value: "Town Hall" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    fireEvent.click(screen.getByRole("button", { name: "Phone" }));
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    expect(screen.getByRole("button", { name: /Creating/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(props.onClose).not.toHaveBeenCalled();

    rejectCreate(new Error("Network error"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network error");
    expect(screen.getByRole("button", { name: "Phone" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Create event" }),
    ).not.toBeDisabled();
  });

  it("closes immediately when clean and prompts discard confirmation when dirty", () => {
    const { props, rerender } = renderCreateWizard();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    rerender(<CreateEventWizardDialog {...props} open={false} />);
    rerender(<CreateEventWizardDialog {...props} open />);

    fireEvent.change(screen.getByLabelText(/Event name/i), {
      target: { value: "Draft Event" },
    });
    fireEvent.keyDown(window, { key: "Escape" });

    const alert = screen.getByRole("alertdialog");
    expect(within(alert).getByText("Discard changes?")).toBeInTheDocument();
    expect(
      within(alert).getByText(
        "You have started creating this event. Closing now will lose it.",
      ),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Event name/i)).toHaveValue("Draft Event");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
    expect(props.onCreate).not.toHaveBeenCalled();
  });
});
