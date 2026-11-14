import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkInMember } from "@/app/actions";
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

  beforeEach(() => {
    vi.clearAllMocks();
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

    fireEvent.click(screen.getByRole("button", { name: "Enter member ID manually" }));

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
    expect(screen.getAllByText("Member ID · FNC-001").length).toBeGreaterThanOrEqual(2);
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

    fireEvent.click(screen.getByRole("button", { name: "Enter member ID manually" }));

    await waitFor(() => {
      expect(screen.getByTestId("scan-toast")).toBeInTheDocument();
    });

    const toast = screen.getByTestId("scan-toast");
    expect(toast).toHaveTextContent("GH");
    expect(toast).toHaveTextContent("Grace Hopper");
    expect(toast).toHaveTextContent("Member ID · FNC-002");
    expect(toast.querySelector("img")).toBeNull();
  });
});
