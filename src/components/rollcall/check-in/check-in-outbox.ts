import type { DashboardData, DirectoryMember } from "@/app/actions";
import {
  getAvatarColor,
  getInitials,
} from "@/components/rollcall/shared/member-utils";
import type { Member } from "@/components/rollcall/shared/types";
import { toDateOnly } from "@/lib/date";

const ROSTER_STORAGE_KEY = "rollcall.roster.v1";
const OUTBOX_STORAGE_KEY = "rollcall.outbox.v1";
const PHOTO_CACHE_NAME = "rollcall-member-photos-v1";
const MAX_RETRY_DELAY_MS = 15_000;
const BASE_RETRY_DELAY_MS = 2_000;

export type OutboxCheckInItem = {
  kind?: "check_in";
  clientCheckInId: string;
  eventId: string;
  memberUuid: string;
  memberId: string;
  createdDate: string;
  createdAt: string;
  memberSnapshot: Member;
  retryCount: number;
};

export type OutboxDeleteItem = {
  kind: "delete";
  clientOutboxId: string;
  eventId: string;
  checkInId: string;
  retryCount: number;
};

export type OutboxItem = OutboxCheckInItem | OutboxDeleteItem;

function isDeleteItem(item: OutboxItem): item is OutboxDeleteItem {
  return item.kind === "delete";
}

function getOutboxItemId(item: OutboxItem): string {
  return isDeleteItem(item) ? item.clientOutboxId : item.clientCheckInId;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private-browsing write failures.
  }
}

export function saveCachedRoster(roster: DirectoryMember[]): void {
  writeJson(ROSTER_STORAGE_KEY, roster);
}

export function loadCachedRoster(): DirectoryMember[] {
  const parsed = readJson<DirectoryMember[]>(ROSTER_STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function findRosterMember(
  roster: DirectoryMember[],
  rawMemberId: string,
): DirectoryMember | undefined {
  const normalized = rawMemberId.trim();
  if (!normalized) return undefined;
  return roster.find((member) => member.memberId === normalized);
}

export function loadOutbox(eventId?: string): OutboxItem[] {
  const parsed = readJson<OutboxItem[]>(OUTBOX_STORAGE_KEY, []);
  if (!Array.isArray(parsed)) return [];
  if (!eventId) return parsed;
  return parsed.filter((item) => item.eventId === eventId);
}

export function saveOutbox(items: OutboxItem[]): void {
  writeJson(OUTBOX_STORAGE_KEY, items);
}

export function enqueueOutboxCheckIn(
  eventId: string,
  member: DirectoryMember,
  now = new Date(),
): OutboxCheckInItem {
  const clientCheckInId = `local-${crypto.randomUUID()}`;
  const createdAt = now.toISOString();
  const createdDate = toDateOnly(createdAt);

  const memberSnapshot: Member = {
    checkInId: clientCheckInId,
    id: member.memberId,
    name: member.name,
    initials: getInitials(member.name),
    date: createdDate,
    createdDate,
    color: getAvatarColor(member.name),
    email: member.email,
    phone: member.phone,
    address: member.address,
    dob: member.dob,
    pictureUrl: member.pictureUrl,
    syncStatus: "pending",
  };

  const item: OutboxCheckInItem = {
    kind: "check_in",
    clientCheckInId,
    eventId,
    memberUuid: member.id,
    memberId: member.memberId,
    createdDate,
    createdAt,
    memberSnapshot,
    retryCount: 0,
  };

  const current = loadOutbox();
  saveOutbox([item, ...current]);
  return item;
}

export function enqueueOutboxDelete(
  eventId: string,
  checkInId: string,
): OutboxDeleteItem {
  const current = loadOutbox();
  const existing = current.find(
    (item): item is OutboxDeleteItem =>
      isDeleteItem(item) &&
      item.eventId === eventId &&
      item.checkInId === checkInId,
  );
  if (existing) return existing;

  const item: OutboxDeleteItem = {
    kind: "delete",
    clientOutboxId: `del-${crypto.randomUUID()}`,
    eventId,
    checkInId,
    retryCount: 0,
  };
  saveOutbox([item, ...current]);
  return item;
}

export function removeOutboxCheckIn(clientOutboxId: string): void {
  const current = loadOutbox();
  const next = current.filter(
    (item) => getOutboxItemId(item) !== clientOutboxId,
  );
  if (next.length !== current.length) {
    saveOutbox(next);
  }
}

export function mergeCheckInsWithOutbox(
  serverCheckIns: Member[],
  outboxItems: OutboxItem[],
  eventId: string,
): Member[] {
  const pendingDeleteIds = new Set(
    outboxItems
      .filter((item): item is OutboxDeleteItem => isDeleteItem(item))
      .filter((item) => item.eventId === eventId)
      .map((item) => item.checkInId),
  );

  const syncedMembers = serverCheckIns
    .filter((member) => !pendingDeleteIds.has(member.checkInId))
    .map((member) => ({
      ...member,
      syncStatus: "synced" as const,
    }));
  const syncedMemberIds = new Set(syncedMembers.map((member) => member.id));

  const pendingMembers = outboxItems
    .filter((item): item is OutboxCheckInItem => !isDeleteItem(item))
    .filter(
      (item) =>
        item.eventId === eventId && !syncedMemberIds.has(item.memberId),
    )
    .map((item) => ({
      ...item.memberSnapshot,
      syncStatus: "pending" as const,
    }));

  return [...pendingMembers, ...syncedMembers];
}

export function getRetryDelayMs(retryCount: number): number {
  if (retryCount <= 0) return BASE_RETRY_DELAY_MS;
  return Math.min(
    MAX_RETRY_DELAY_MS,
    BASE_RETRY_DELAY_MS * 2 ** (retryCount - 1),
  );
}

export async function flushOutbox(options: {
  eventId?: string;
  syncFn: (
    item: OutboxCheckInItem,
  ) => Promise<DashboardData["checkIns"][number]>;
  deleteFn?: (item: OutboxDeleteItem) => Promise<void>;
  onItemSynced?: (
    clientCheckInId: string,
    synced: DashboardData["checkIns"][number],
  ) => void;
  onItemDeleted?: (checkInId: string) => void;
}): Promise<{
  syncedCount: number;
  remainingCount: number;
  hadError: boolean;
}> {
  const { eventId, syncFn, deleteFn, onItemSynced, onItemDeleted } = options;
  const targets = loadOutbox(eventId);
  if (targets.length === 0) {
    return { syncedCount: 0, remainingCount: 0, hadError: false };
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      syncedCount: 0,
      remainingCount: targets.length,
      hadError: false,
    };
  }

  let syncedCount = 0;
  // Drain oldest-queued items first so check-ins and deletes replay in order.
  const orderedTargets = [...targets].reverse();

  for (const target of orderedTargets) {
    const targetId = getOutboxItemId(target);
    const stillQueued = loadOutbox().some(
      (item) => getOutboxItemId(item) === targetId,
    );
    if (!stillQueued) continue;

    try {
      if (isDeleteItem(target)) {
        if (!deleteFn) continue;
        await deleteFn(target);
        const presentAfterDelete = loadOutbox().some(
          (item) => getOutboxItemId(item) === targetId,
        );
        if (presentAfterDelete) {
          removeOutboxCheckIn(targetId);
          syncedCount += 1;
          onItemDeleted?.(target.checkInId);
        }
      } else {
        const synced = await syncFn(target);
        const presentAfterSync = loadOutbox().some(
          (item) => getOutboxItemId(item) === targetId,
        );
        if (presentAfterSync) {
          removeOutboxCheckIn(targetId);
          syncedCount += 1;
          onItemSynced?.(target.clientCheckInId, synced);
        }
      }
    } catch {
      const updated = loadOutbox().map((item) =>
        getOutboxItemId(item) === targetId
          ? { ...item, retryCount: item.retryCount + 1 }
          : item,
      );
      saveOutbox(updated);
      return {
        syncedCount,
        remainingCount: loadOutbox(eventId).length,
        hadError: true,
      };
    }
  }

  return {
    syncedCount,
    remainingCount: loadOutbox(eventId).length,
    hadError: false,
  };
}

export async function warmMemberPhotos(
  pictureUrls: string[],
  options?: { concurrency?: number; signal?: AbortSignal },
): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;

  const uniqueUrls = Array.from(
    new Set(pictureUrls.map((url) => url.trim()).filter(Boolean)),
  );
  if (uniqueUrls.length === 0) return;

  let cache: Cache;
  try {
    cache = await window.caches.open(PHOTO_CACHE_NAME);
  } catch {
    return;
  }

  const concurrency = Math.max(1, options?.concurrency ?? 3);
  let index = 0;

  async function worker() {
    while (index < uniqueUrls.length) {
      if (options?.signal?.aborted) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return;
      }

      const url = uniqueUrls[index];
      index += 1;
      if (!url) continue;

      try {
        const cached = await cache.match(url);
        if (cached) continue;

        const response = await fetch(url, { signal: options?.signal });
        if (response.ok) {
          await cache.put(url, response.clone());
        }
      } catch {
        // Best-effort warming; Avatar falls back to initials if uncached offline.
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, uniqueUrls.length) }, () =>
      worker(),
    ),
  );
}
