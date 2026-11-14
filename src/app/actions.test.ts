import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetUser,
  mockFrom,
  mockRevalidatePath,
  mockUpdateTag,
  mockRedirect,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockUpdateTag: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidatePath: mockRevalidatePath,
  updateTag: mockUpdateTag,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import {
  createMember,
  deleteMember,
  getDashboardData,
  saveEvent,
  updateMember,
} from "./actions";

describe("server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("creates a member with optional email and phone", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "uuid-1",
        member_id: "FNC-100",
        name: "Ada Lovelace",
        email: "ada@example.com",
        phone: "555-0100",
        address: "10 Downing",
        dob: "1815-12-10",
        picture_url: "https://example.com/ada.jpg",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mockFrom.mockReturnValue({ insert });

    const member = await createMember({
      memberId: "FNC-100",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "555-0100",
      address: "10 Downing",
      dob: "1815-12-10",
      pictureUrl: "https://example.com/ada.jpg",
    });

    expect(insert).toHaveBeenCalledWith({
      member_id: "FNC-100",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "555-0100",
      address: "10 Downing",
      dob: "1815-12-10",
      picture_url: "https://example.com/ada.jpg",
    });
    expect(member).toEqual({
      id: "uuid-1",
      memberId: "FNC-100",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "555-0100",
      address: "10 Downing",
      dob: "1815-12-10",
      pictureUrl: "https://example.com/ada.jpg",
    });
  });

  it("updates a member without modifying member_id", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "uuid-1",
        member_id: "FNC-100",
        name: "Ada King",
        email: "ada@example.com",
        phone: "555-0199",
        address: "",
        dob: null,
        picture_url: "",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    const updated = await updateMember({
      id: "uuid-1",
      name: "Ada King",
      email: "ada@example.com",
      phone: "555-0199",
    });

    expect(update).toHaveBeenCalledWith({
      name: "Ada King",
      email: "ada@example.com",
      phone: "555-0199",
      address: "",
      dob: null,
      picture_url: "",
    });
    expect(update.mock.calls[0][0]).not.toHaveProperty("member_id");
    expect(eq).toHaveBeenCalledWith("id", "uuid-1");
    expect(updated.memberId).toBe("FNC-100");
    expect(updated.name).toBe("Ada King");
  });

  it("deletes a member by id", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ delete: del });

    await deleteMember("uuid-1");

    expect(mockFrom).toHaveBeenCalledWith("members");
    expect(eq).toHaveBeenCalledWith("id", "uuid-1");
    expect(mockUpdateTag).toHaveBeenCalledWith("members");
  });

  it("saves an event with an explicit eventDate", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    const id = await saveEvent({
      id: "event-1",
      name: "Town Hall",
      eventDate: "2026-11-20",
      trackedFields: ["Name", "Member ID", "Email"],
    });

    expect(id).toBe("event-1");
    expect(update).toHaveBeenCalledWith({
      name: "Town Hall",
      event_date: "2026-11-20",
      tracked_fields: ["Name", "Member ID", "Email"],
    });
  });

  it("returns eventDate and full member fields from getDashboardData", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "events") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "event-1",
                    name: "Town Hall",
                    event_date: "2026-11-20",
                    tracked_fields: ["Name", "Member ID", "Phone"],
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "check_ins") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  {
                    id: "ci-1",
                    member_id: "uuid-1",
                    created_at: "2026-11-20",
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "members") {
        return {
          select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return Promise.resolve({ count: 5, error: null });
            }
            return {
              in: async () => ({
                data: [
                  {
                    id: "uuid-1",
                    member_id: "FNC-100",
                    name: "Ada Lovelace",
                    email: "ada@example.com",
                    phone: "555-0100",
                    address: "10 Downing",
                    dob: "1815-12-10",
                    picture_url: "https://example.com/ada.jpg",
                  },
                ],
                error: null,
              }),
            };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const data = await getDashboardData("event-1");
    expect(data.event).toEqual({
      id: "event-1",
      name: "Town Hall",
      eventDate: "2026-11-20",
      trackedFields: ["Name", "Member ID", "Phone"],
    });
    expect(data.checkIns).toEqual([
      {
        checkInId: "ci-1",
        id: "FNC-100",
        name: "Ada Lovelace",
        email: "ada@example.com",
        phone: "555-0100",
        address: "10 Downing",
        dob: "1815-12-10",
        pictureUrl: "https://example.com/ada.jpg",
        createdDate: "2026-11-20",
      },
    ]);
  });
});
