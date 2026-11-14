import { describe, expect, it } from "vitest";
import { read, utils } from "xlsx";

import { POST } from "./route";

describe("POST /api/export/[eventId]", () => {
  it("exports only the columns matching trackedFields plus Date", async () => {
    const request = new Request("http://localhost/api/export/event-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "Town Hall",
        trackedFields: ["Name", "Member ID", "Email", "Address"],
        members: [
          {
            id: "FNC-001",
            name: "Ada Lovelace",
            email: "ada@example.com",
            phone: "555-0100",
            address: "10 Downing St",
            dob: "1815-12-10",
            pictureUrl: "https://example.com/ada.jpg",
            date: "2026-11-20",
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain(
      "town-hall-attendance.xlsx",
    );

    const buffer = await response.arrayBuffer();
    const workbook = read(buffer, { type: "array" });
    const sheet = workbook.Sheets.Attendance;
    const rows = utils.sheet_to_json<Record<string, string>>(sheet);

    expect(rows).toEqual([
      {
        Name: "Ada Lovelace",
        "Member ID": "FNC-001",
        Email: "ada@example.com",
        Address: "10 Downing St",
        Date: "2026-11-20",
      },
    ]);
  });

  it("returns 400 when eventName or members is invalid", async () => {
    const request = new Request("http://localhost/api/export/event-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
