import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DirectoryMember } from "@/app/actions";
import {
  enqueueOutboxCheckIn,
  enqueueOutboxDelete,
  findRosterMember,
  flushOutbox,
  getRetryDelayMs,
  loadCachedRoster,
  loadOutbox,
  mergeCheckInsWithOutbox,
  removeOutboxCheckIn,
  saveCachedRoster,
  warmMemberPhotos,
} from "./check-in-outbox";

const sampleRoster: DirectoryMember[] = [
  {
    id: "uuid-1",
    memberId: "FNC-001",
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "555-0100",
    address: "10 Downing St",
    dob: "1815-12-10",
    pictureUrl: "https://example.com/ada.webp",
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

describe("check-in-outbox", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("persists and queries the local member roster", () => {
    saveCachedRoster(sampleRoster);
    const loaded = loadCachedRoster();
    expect(loaded).toEqual(sampleRoster);
    expect(findRosterMember(loaded, "  FNC-001 ")?.name).toBe("Ada Lovelace");
    expect(findRosterMember(loaded, "UNKNOWN")).toBeUndefined();
  });

  it("enqueues, merges, and removes pending outbox check-ins per event", () => {
    const item = enqueueOutboxCheckIn(
      "evt-1",
      sampleRoster[0],
      new Date("2026-11-20T12:00:00.000Z"),
    );

    expect(item.clientCheckInId).toMatch(/^local-/);
    expect(item.memberSnapshot.syncStatus).toBe("pending");
    expect(loadOutbox("evt-1")).toHaveLength(1);
    expect(loadOutbox("evt-2")).toHaveLength(0);

    const merged = mergeCheckInsWithOutbox(
      [
        {
          checkInId: "ci-2",
          id: "FNC-002",
          name: "Grace Hopper",
          initials: "GH",
          date: "2026-11-20",
          createdDate: "2026-11-20",
          color: "bg-[#e3f2ef] text-[#0b5e52]",
        },
      ],
      loadOutbox("evt-1"),
      "evt-1",
    );

    expect(merged.map((m) => [m.id, m.syncStatus])).toEqual([
      ["FNC-001", "pending"],
      ["FNC-002", "synced"],
    ]);

    removeOutboxCheckIn(item.clientCheckInId);
    expect(loadOutbox("evt-1")).toHaveLength(0);
  });

  it("deduplicates pending outbox items when already synced on the server", () => {
    enqueueOutboxCheckIn("evt-1", sampleRoster[0]);

    const merged = mergeCheckInsWithOutbox(
      [
        {
          checkInId: "ci-1",
          id: "FNC-001",
          name: "Ada Lovelace",
          initials: "AL",
          date: "2026-11-20",
          createdDate: "2026-11-20",
          color: "bg-[#e3f2ef] text-[#0b5e52]",
        },
      ],
      loadOutbox("evt-1"),
      "evt-1",
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].checkInId).toBe("ci-1");
    expect(merged[0].syncStatus).toBe("synced");
  });

  it("flushes outbox items in FIFO order when online and increments retryCount on failure", async () => {
    const first = enqueueOutboxCheckIn("evt-1", sampleRoster[0]);
    const second = enqueueOutboxCheckIn("evt-1", sampleRoster[1]);

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    const offlineSync = vi.fn();
    const offlineResult = await flushOutbox({
      eventId: "evt-1",
      syncFn: offlineSync,
    });
    expect(offlineSync).not.toHaveBeenCalled();
    expect(offlineResult).toEqual({
      syncedCount: 0,
      remainingCount: 2,
      hadError: false,
    });

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    const failingSync = vi.fn().mockRejectedValueOnce(new Error("Network down"));
    const failResult = await flushOutbox({
      eventId: "evt-1",
      syncFn: failingSync,
    });
    expect(failResult).toEqual({
      syncedCount: 0,
      remainingCount: 2,
      hadError: true,
    });
    expect(
      loadOutbox("evt-1").find(
        (i) => i.kind !== "delete" && i.clientCheckInId === first.clientCheckInId,
      )?.retryCount,
    ).toBe(1);

    const syncedOrder: string[] = [];
    const onItemSynced = vi.fn();
    const successSync = vi.fn(async (item) => {
      syncedOrder.push(item.memberId);
      return {
        checkInId: `server-${item.memberId}`,
        id: item.memberId,
        name: item.memberSnapshot.name,
        email: "",
        phone: "",
        address: "",
        dob: "",
        pictureUrl: "",
        createdDate: item.createdDate,
      };
    });

    const successResult = await flushOutbox({
      eventId: "evt-1",
      syncFn: successSync,
      onItemSynced,
    });

    expect(syncedOrder).toEqual(["FNC-001", "FNC-002"]);
    expect(successResult).toEqual({
      syncedCount: 2,
      remainingCount: 0,
      hadError: false,
    });
    expect(onItemSynced).toHaveBeenCalledTimes(2);
    expect(loadOutbox("evt-1")).toHaveLength(0);
    expect(second.clientCheckInId).toMatch(/^local-/);
  });

  it("computes bounded exponential retry delays", () => {
    expect(getRetryDelayMs(0)).toBe(2000);
    expect(getRetryDelayMs(1)).toBe(2000);
    expect(getRetryDelayMs(2)).toBe(4000);
    expect(getRetryDelayMs(3)).toBe(8000);
    expect(getRetryDelayMs(5)).toBe(15000);
  });

  it("warms uncached member photos in CacheStorage and skips already-cached URLs", async () => {
    const match = vi
      .fn()
      .mockResolvedValueOnce(new Response("cached"))
      .mockResolvedValueOnce(undefined);
    const put = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn().mockResolvedValue({ match, put });

    Object.defineProperty(window, "caches", {
      configurable: true,
      value: { open },
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("webp-bytes", { status: 200 }));

    await warmMemberPhotos([
      "https://example.com/cached.webp",
      "https://example.com/new.webp",
      "https://example.com/cached.webp",
      "",
    ]);

    expect(open).toHaveBeenCalledWith("rollcall-member-photos-v1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("https://example.com/new.webp", {
      signal: undefined,
    });
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("queues synced deletes in FIFO order, filters them from merged check-ins, and drains them before re-scans", async () => {
    enqueueOutboxDelete("evt-1", "ci-1");
    enqueueOutboxCheckIn("evt-1", sampleRoster[0]);

    const merged = mergeCheckInsWithOutbox(
      [
        {
          checkInId: "ci-1",
          id: "FNC-001",
          name: "Ada Lovelace",
          initials: "AL",
          date: "2026-11-20",
          createdDate: "2026-11-20",
          color: "bg-[#e3f2ef] text-[#0b5e52]",
        },
      ],
      loadOutbox("evt-1"),
      "evt-1",
    );

    // ci-1 is hidden by pending delete, and the subsequent pending re-scan is visible.
    expect(merged).toHaveLength(1);
    expect(merged[0].syncStatus).toBe("pending");

    const ops: string[] = [];
    const result = await flushOutbox({
      eventId: "evt-1",
      deleteFn: async (item) => {
        ops.push(`delete:${item.checkInId}`);
      },
      syncFn: async (item) => {
        ops.push(`checkin:${item.memberId}`);
        return {
          checkInId: "ci-2",
          id: item.memberId,
          name: item.memberSnapshot.name,
          email: "",
          phone: "",
          address: "",
          dob: "",
          pictureUrl: "",
          createdDate: item.createdDate,
        };
      },
    });

    expect(ops).toEqual(["delete:ci-1", "checkin:FNC-001"]);
    expect(result).toEqual({
      syncedCount: 2,
      remainingCount: 0,
      hadError: false,
    });
  });
});
