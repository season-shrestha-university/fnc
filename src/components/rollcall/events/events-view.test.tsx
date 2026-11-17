import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveEvent } from "@/app/actions";
import { ToastProvider } from "@/components/rollcall/layout/toast-provider";
import EventsView from "./events-view";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/app/actions", () => ({
  saveEvent: vi.fn(),
}));

describe("EventsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens CreateEventWizardDialog, creates event via saveEvent, and routes to check-in", async () => {
    vi.mocked(saveEvent).mockResolvedValue("evt-42");

    render(
      <ToastProvider>
        <EventsView events={[]} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "New event" }));
    expect(screen.getByText("Create event")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Event name/i), {
      target: { value: "Spring Fair" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Create event" }),
    );

    await waitFor(() => {
      expect(saveEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Spring Fair",
          trackedFields: ["Name", "Member ID"],
        }),
      );
    });

    const startButton = await screen.findByRole("button", {
      name: "Start check-in",
    });
    fireEvent.click(startButton);
    expect(pushMock).toHaveBeenCalledWith("/events/evt-42/check-in");
  });
});
