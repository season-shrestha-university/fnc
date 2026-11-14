import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AttendanceView from "./attendance-view";

describe("AttendanceView", () => {
  const members = [
    {
      checkInId: "ci-1",
      id: "FNC-001",
      name: "Ada Lovelace",
      initials: "AL",
      date: "2026-11-20",
      createdDate: "2026-11-20",
      color: "bg-[#e4e3fb] text-[#5956b1]",
      email: "ada@example.com",
      phone: "555-0100",
      address: "10 Downing St",
      dob: "1815-12-10",
      pictureUrl: "https://example.com/ada.jpg",
    },
  ];

  it("renders only the tracked text fields configured for the event while always showing photo avatars", () => {
    render(
      <AttendanceView
        activeEvent="Town Hall"
        members={members}
        trackedFields={["Name", "Member ID", "Address", "Phone"]}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Member ID · FNC-001")).toBeInTheDocument();
    expect(screen.getByText("555-0100 · 10 Downing St")).toBeInTheDocument();
    expect(screen.queryByText(/ada@example.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/1815-12-10/)).not.toBeInTheDocument();
    const img = screen.getByRole("img", { name: "Ada Lovelace" });
    expect(img).toHaveAttribute("src", "https://example.com/ada.jpg");
  });

  it("renders initials fallback when a member has no photo", () => {
    render(
      <AttendanceView
        activeEvent="Town Hall"
        members={[{ ...members[0], pictureUrl: "" }]}
        trackedFields={["Name", "Member ID"]}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("img", { name: "Ada Lovelace" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });
});
