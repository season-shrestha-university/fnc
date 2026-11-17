import { describe, expect, it } from "vitest";

import {
  formatEventDate,
  getEventEditDirtyMap,
  hasCreateUnsavedChanges,
  isEventEditDirty,
  normalizeTrackedFields,
  parseEventDate,
  toEventDateIso,
  validateEventName,
} from "./event-form-types";

describe("event-form-types", () => {
  it("normalizes trackedFields to always include required fields in canonical order", () => {
    expect(normalizeTrackedFields(["Photo", "Email"])).toEqual([
      "Name",
      "Member ID",
      "Email",
      "Photo",
    ]);
    expect(normalizeTrackedFields([])).toEqual(["Name", "Member ID"]);
  });

  it("treats default create state as clean and detects typed name, changed date, or optional toggles", () => {
    const today = "2026-11-17";
    expect(
      hasCreateUnsavedChanges(
        { name: "   ", eventDate: today, trackedFields: ["Name", "Member ID"] },
        today,
      ),
    ).toBe(false);

    expect(
      hasCreateUnsavedChanges(
        { name: "Lunch", eventDate: today, trackedFields: ["Name", "Member ID"] },
        today,
      ),
    ).toBe(true);

    expect(
      hasCreateUnsavedChanges(
        { name: "", eventDate: "2026-11-18", trackedFields: ["Name", "Member ID"] },
        today,
      ),
    ).toBe(true);

    expect(
      hasCreateUnsavedChanges(
        { name: "", eventDate: today, trackedFields: ["Name", "Member ID", "Phone"] },
        today,
      ),
    ).toBe(true);
  });

  it("computes per-section dirty state against edit snapshot and clears when reverted", () => {
    const snapshot = {
      name: "Community Lunch",
      eventDate: "2026-11-17",
      trackedFields: ["Name", "Member ID", "Email"],
    };

    expect(
      isEventEditDirty(
        getEventEditDirtyMap(snapshot, {
          name: "  Community Lunch ",
          eventDate: "2026-11-17",
          trackedFields: ["Email", "Member ID", "Name"],
        }),
      ),
    ).toBe(false);

    expect(
      getEventEditDirtyMap(snapshot, {
        name: "Community Lunch",
        eventDate: "2026-11-17",
        trackedFields: ["Name", "Member ID", "Email", "Phone"],
      }),
    ).toEqual({ basics: false, fields: true });

    expect(
      getEventEditDirtyMap(snapshot, {
        name: "Saturday Lunch",
        eventDate: "2026-11-17",
        trackedFields: ["Name", "Member ID", "Email"],
      }),
    ).toEqual({ basics: true, fields: false });
  });

  it("validates required event name and formats YYYY-MM-DD dates in UTC", () => {
    expect(validateEventName("")).toBe("Give the event a name");
    expect(validateEventName("   ")).toBe("Give the event a name");
    expect(validateEventName("Community Lunch")).toBeUndefined();
    expect(formatEventDate("2026-11-17")).toBe("17 Nov 2026");
  });

  it("round-trips YYYY-MM-DD dates with parseEventDate and toEventDateIso", () => {
    const parsed = parseEventDate("2026-11-17");
    expect(parsed).toBeInstanceOf(Date);
    expect(toEventDateIso(parsed!)).toBe("2026-11-17");
    expect(parseEventDate("invalid")).toBeUndefined();
  });
});
