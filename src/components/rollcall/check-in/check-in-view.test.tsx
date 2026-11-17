import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkInMember, deleteEvent, removeCheckIn, saveEvent } from "@/app/actions";
import { loadOutbox } from "@/components/rollcall/check-in/check-in-outbox";
import CheckInView from "@/components/rollcall/check-in/check-in-view";
import { ToastProvider } from "@/components/rollcall/layout/toast-provider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/actions", () => ({
  checkInMember: vi.fn(),
  deleteEvent: vi.fn(),
  removeCheckIn: vi.fn(),
  saveEvent: vi.fn(),
}));

vi.mock("@/components/rollcall/check-in/use-qr-scanner", () => ({
  useQrScanner: () => ({
    isScanning: false,
    startScan: vi.fn(),
    cancelScan: vi.fn(),
    videoRef: { current: null },
  }),
}));

describe("CheckInView", () => {
  const event = {
    id: "evt-1",
    name: "Town Hall",
    eventDate: "2026-11-20",
    trackedFields: ["Name", "Member ID"],
  };

  const roster = [
    {
      id: "uuid-1",
      memberId: "FNC-001",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "555-0100",
      address: "10 Downing St",
      dob: "1815-12-10",
      pictureUrl: "https://example.com/ada.jpg",
    },
    {
      id: "uuid-2",
      memberId: "FNC-002",
      name: "Grace Hopper",
      email: "",
      phone: "",
      address: "",
      dob: "",
      pictureUrl: "",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("shows member photo, name, and member ID in toast and last check-in on successful check-in", async () => {
    vi.mocked(checkInMember).mockResolvedValue({
      checkInId: "ci-1",
      id: "FNC-001",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "555-0100",
      address: "10 Downing St",
      dob: "1815-12-10",
      pictureUrl: "https://example.com/ada.jpg",
      createdDate: "2026-11-20",
    });
    vi.spyOn(window, "prompt").mockReturnValue("FNC-001");

    render(
      <ToastProvider>
        <CheckInView event={event} memberCount={10} checkIns={[]} />
      </ToastProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Enter member ID manually" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("scan-toast")).toBeInTheDocument();
    });

    const toast = screen.getByTestId("scan-toast");
    expect(toast).toHaveTextContent("Ada Lovelace");
    expect(toast).toHaveTextContent("Member ID · FNC-001");
    expect(toast.querySelector("img")).toHaveAttribute(
      "src",
      "https://example.com/ada.jpg",
    );

    const images = screen.getAllByRole("img", { name: "Ada Lovelace" });
    expect(images.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getAllByText("Member ID · FNC-001").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("shows initials fallback with name and member ID when checked-in member has no photo", async () => {
    vi.mocked(checkInMember).mockResolvedValue({
      checkInId: "ci-2",
      id: "FNC-002",
      name: "Grace Hopper",
      email: "",
      phone: "",
      address: "",
      dob: "",
      pictureUrl: "",
      createdDate: "2026-11-20",
    });
    vi.spyOn(window, "prompt").mockReturnValue("FNC-002");

    render(
      <ToastProvider>
        <CheckInView event={event} memberCount={10} checkIns={[]} />
      </ToastProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Enter member ID manually" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("scan-toast")).toBeInTheDocument();
    });

    const toast = screen.getByTestId("scan-toast");
    expect(toast).toHaveTextContent("GH");
    expect(toast).toHaveTextContent("Grace Hopper");
    expect(toast).toHaveTextContent("Member ID · FNC-002");
    expect(toast.querySelector("img")).toBeNull();
  });

  it("checks in offline using cached roster, prevents duplicates, and syncs on reconnect", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    vi.spyOn(window, "prompt").mockReturnValue("FNC-001");

    render(
      <ToastProvider>
        <CheckInView
          event={event}
          memberCount={10}
          roster={roster}
          checkIns={[]}
        />
      </ToastProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Enter member ID manually" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("scan-toast")).toHaveTextContent("Ada Lovelace");
    });

    expect(checkInMember).not.toHaveBeenCalled();
    expect(loadOutbox("evt-1")).toHaveLength(1);
    expect(screen.getByTestId("outbox-status")).toHaveTextContent(
      "Offline · 1 check-in waiting to sync",
    );
    expect(screen.getAllByLabelText("Pending sync").length).toBeGreaterThan(0);

    // Duplicate scan while still pending in outbox is rejected locally.
    fireEvent.click(
      screen.getByRole("button", { name: "Enter member ID manually" }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("scan-toast")).toHaveTextContent(
        "Ada Lovelace is already checked in",
      );
    });

    vi.mocked(checkInMember).mockResolvedValueOnce({
      checkInId: "ci-server-1",
      id: "FNC-001",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "555-0100",
      address: "10 Downing St",
      dob: "1815-12-10",
      pictureUrl: "https://example.com/ada.jpg",
      createdDate: "2026-11-20",
    });

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(checkInMember).toHaveBeenCalledWith(
        "evt-1",
        "FNC-001",
        expect.objectContaining({ idempotent: true }),
      );
      expect(loadOutbox("evt-1")).toHaveLength(0);
      expect(screen.getByTestId("outbox-status")).toHaveTextContent(
        "All check-ins synced",
      );
      expect(screen.getAllByLabelText("Synced").length).toBeGreaterThan(0);
    });
  });

  it("removes a pending outbox check-in locally on swipe delete without calling removeCheckIn", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    vi.spyOn(window, "prompt").mockReturnValue("FNC-002");

    render(
      <ToastProvider>
        <CheckInView
          event={event}
          memberCount={10}
          roster={roster}
          checkIns={[]}
        />
      </ToastProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Enter member ID manually" }),
    );

    await waitFor(() => {
      expect(loadOutbox("evt-1")).toHaveLength(1);
    });

    // Open attendance view to verify row and swipe-delete
    fireEvent.click(screen.getByRole("button", { name: "View attendance" }));
    const rowText = screen.getAllByText("Grace Hopper")[0];
    const rowCard = rowText.closest("div[style]") as HTMLElement;
    expect(rowCard).toBeTruthy();

    fireEvent.mouseDown(rowCard, { clientX: 200, clientY: 10 });
    fireEvent.mouseMove(rowCard, { clientX: 80, clientY: 10 });
    fireEvent.mouseUp(rowCard, { clientX: 80, clientY: 10 });

    await waitFor(() => {
      expect(loadOutbox("evt-1")).toHaveLength(0);
    });
    expect(removeCheckIn).not.toHaveBeenCalled();
  });

  it("queues delete for an already-synced check-in while offline and drains it on reconnect", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    vi.mocked(removeCheckIn).mockResolvedValue(undefined);

    render(
      <ToastProvider>
        <CheckInView
          event={event}
          memberCount={10}
          roster={roster}
          checkIns={[
            {
              checkInId: "ci-server-1",
              id: "FNC-001",
              name: "Ada Lovelace",
              email: "ada@example.com",
              phone: "555-0100",
              address: "10 Downing St",
              dob: "1815-12-10",
              pictureUrl: "https://example.com/ada.jpg",
              createdDate: "2026-11-20",
            },
          ]}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "View attendance" }));
    const rowText = screen.getByText("Ada Lovelace");
    const rowCard = rowText.closest("div[style]") as HTMLElement;
    expect(rowCard).toBeTruthy();

    fireEvent.mouseDown(rowCard, { clientX: 200, clientY: 10 });
    fireEvent.mouseMove(rowCard, { clientX: 80, clientY: 10 });
    fireEvent.mouseUp(rowCard, { clientX: 80, clientY: 10 });

    await waitFor(() => {
      expect(loadOutbox("evt-1")).toHaveLength(1);
    });
    expect(removeCheckIn).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Back to check-in" }));
    expect(screen.getByTestId("outbox-status")).toHaveTextContent(
      "Offline · 1 check-in waiting to sync",
    );

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(removeCheckIn).toHaveBeenCalledWith("ci-server-1");
      expect(loadOutbox("evt-1")).toHaveLength(0);
      expect(screen.getByTestId("outbox-status")).toHaveTextContent(
        "All check-ins synced",
      );
    });
  });

  it("edits and deletes the active event through EditEventDialog", async () => {
    vi.mocked(saveEvent).mockResolvedValue("evt-1");
    vi.mocked(deleteEvent).mockResolvedValue(undefined);

    render(
      <ToastProvider>
        <CheckInView event={event} memberCount={10} checkIns={[]} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update event" }));
    expect(screen.getByText("Edit event")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Event name/i), {
      target: { value: "Town Hall Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(saveEvent).toHaveBeenCalledWith({
        id: "evt-1",
        name: "Town Hall Updated",
        eventDate: "2026-11-20",
        trackedFields: ["Name", "Member ID"],
      });
    });

    expect(screen.getByText("Town Hall Updated")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Update event" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));
    const confirmButtons = screen.getAllByRole("button", {
      name: "Delete event",
    });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(deleteEvent).toHaveBeenCalledWith("evt-1");
    });
  });

  it("supports Undo on the success door sheet and shows error door sheet for unknown IDs", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    vi.spyOn(window, "prompt")
      .mockReturnValueOnce("FNC-001")
      .mockReturnValueOnce("UNKNOWN-99");

    render(
      <ToastProvider>
        <CheckInView
          event={event}
          memberCount={10}
          roster={roster}
          checkIns={[]}
        />
      </ToastProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Enter member ID manually" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("scan-toast")).toHaveAttribute(
        "data-variant",
        "success",
      );
    });
    expect(loadOutbox("evt-1")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(loadOutbox("evt-1")).toHaveLength(0);

    fireEvent.click(
      screen.getByRole("button", { name: "Enter member ID manually" }),
    );
    await waitFor(() => {
      const sheet = screen.getByTestId("scan-toast");
      expect(sheet).toHaveAttribute("data-variant", "error");
      expect(sheet).toHaveTextContent("Member not found");
    });
  });
});
