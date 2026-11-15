"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock,
  CloudOff,
  Keyboard,
  Loader2,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
} from "lucide-react";

import {
  checkInMember,
  deleteEvent as deleteEventAction,
  removeCheckIn,
  saveEvent,
} from "@/app/actions";
import type { DashboardData } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AttendanceView, {
  Avatar,
  MemberRow,
} from "@/components/rollcall/check-in/attendance-view";
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
} from "@/components/rollcall/check-in/check-in-outbox";
import { useQrScanner } from "@/components/rollcall/check-in/use-qr-scanner";
import EventDialogs from "@/components/rollcall/events/event-dialogs";
import { useToast } from "@/components/rollcall/layout/toast-provider";
import LocalDate from "@/components/rollcall/shared/local-date";
import {
  defaultTrackedFields,
  formatCheckInDate,
  getAvatarColor,
  getInitials,
  toMember,
} from "@/components/rollcall/shared/member-utils";
import type { Member } from "@/components/rollcall/shared/types";
import { getCurrentDate } from "@/lib/date";

function playBeep(frequency: number) {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextConstructor) return;

  const audioContext = new AudioContextConstructor();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.08;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.12);
  oscillator.addEventListener("ended", () => void audioContext.close(), {
    once: true,
  });
}

function subscribeOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

export default function CheckInView({
  event,
  memberCount,
  roster = [],
  checkIns,
}: {
  event: DashboardData["event"];
  memberCount: DashboardData["memberCount"];
  roster?: DashboardData["roster"];
  checkIns: DashboardData["checkIns"];
}) {
  const router = useRouter();
  const showToast = useToast();
  const [, startTransition] = useTransition();
  const [members, setMembers] = useState<Member[]>(() =>
    checkIns.map((checkIn) => ({ ...toMember(checkIn), syncStatus: "synced" })),
  );
  const [syncedCheckIns, setSyncedCheckIns] = useState(checkIns);
  const [currentEvent, setCurrentEvent] = useState(event);
  const [syncedEvent, setSyncedEvent] = useState(event);
  const [search, setSearch] = useState("");
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false);
  const [eventName, setEventName] = useState(event?.name ?? "");
  const [eventDate, setEventDate] = useState(
    event?.eventDate ?? getCurrentDate(),
  );
  const [trackedFields, setTrackedFields] = useState(
    event?.trackedFields ?? defaultTrackedFields,
  );
  const [isCheckInPending, setIsCheckInPending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncingOutbox, setIsSyncingOutbox] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const checkInPendingRef = useRef(false);
  const syncInFlightRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);
  const justSyncedTimerRef = useRef<number | null>(null);
  const triggerSyncRef = useRef<() => Promise<void>>(async () => undefined);

  const activeEvent = currentEvent?.name ?? "";
  const eventId = currentEvent?.id ?? "";

  // Server data is the source of truth: adopt it whenever the route re-renders
  // (e.g. after a Server Action revalidates), preserving any still-pending outbox items.
  if (syncedCheckIns !== checkIns) {
    setSyncedCheckIns(checkIns);
    setMembers(
      mergeCheckInsWithOutbox(
        checkIns.map(toMember),
        typeof window !== "undefined" && eventId ? loadOutbox(eventId) : [],
        eventId,
      ),
    );
  }
  if (syncedEvent !== event) {
    setSyncedEvent(event);
    setCurrentEvent(event);
  }

  const attendance = members.length;
  const attendancePercentage = memberCount
    ? Math.round((attendance / memberCount) * 100)
    : 0;

  async function triggerOutboxSync() {
    if (!eventId || syncInFlightRef.current) return;
    const queued = loadOutbox(eventId);
    setPendingCount(queued.length);
    if (queued.length === 0) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return;
    }

    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    syncInFlightRef.current = true;
    setIsSyncingOutbox(true);
    try {
      const result = await flushOutbox({
        eventId,
        syncFn: (item) =>
          checkInMember(item.eventId, item.memberId, {
            idempotent: true,
            createdAt: item.createdAt,
          }),
        deleteFn: (item) => removeCheckIn(item.checkInId),
        onItemSynced: (clientCheckInId, synced) => {
          setMembers((current) =>
            current.map((member) =>
              member.checkInId === clientCheckInId
                ? { ...toMember(synced), syncStatus: "synced" }
                : member,
            ),
          );
        },
      });
      setPendingCount(result.remainingCount);
      if (result.remainingCount === 0) {
        retryAttemptRef.current = 0;
        if (result.syncedCount > 0) {
          setJustSynced(true);
          if (justSyncedTimerRef.current !== null) {
            window.clearTimeout(justSyncedTimerRef.current);
          }
          justSyncedTimerRef.current = window.setTimeout(() => {
            setJustSynced(false);
          }, 3000);
        }
      } else if (result.hadError) {
        retryAttemptRef.current += 1;
        const delay = getRetryDelayMs(retryAttemptRef.current);
        retryTimerRef.current = window.setTimeout(() => {
          void triggerSyncRef.current();
        }, delay);
      }
    } finally {
      syncInFlightRef.current = false;
      setIsSyncingOutbox(false);
    }
  }

  useEffect(() => {
    triggerSyncRef.current = triggerOutboxSync;
  });

  useEffect(() => {
    if (roster.length > 0) {
      saveCachedRoster(roster);
    }
    const controller = new AbortController();
    const photoUrls = (roster.length > 0 ? roster : loadCachedRoster()).map(
      (member) => member.pictureUrl,
    );
    void warmMemberPhotos(photoUrls, { signal: controller.signal });
    return () => controller.abort();
  }, [roster]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const outboxItems = loadOutbox(eventId);
      setPendingCount(outboxItems.length);
      if (outboxItems.length > 0) {
        setMembers(
          mergeCheckInsWithOutbox(
            syncedCheckIns.map(toMember),
            outboxItems,
            eventId,
          ),
        );
        void triggerSyncRef.current();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, syncedCheckIns]);

  useEffect(() => {
    function handleOnline() {
      void triggerSyncRef.current();
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void triggerSyncRef.current();
      }
    }

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
      }
      if (justSyncedTimerRef.current !== null) {
        window.clearTimeout(justSyncedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pendingCount === 0) return;
    function handleBeforeUnload(unloadEvent: BeforeUnloadEvent) {
      unloadEvent.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pendingCount]);

  function openEventDialog() {
    setEventName(currentEvent?.name ?? "");
    setEventDate(currentEvent?.eventDate ?? getCurrentDate());
    setTrackedFields(currentEvent?.trackedFields ?? defaultTrackedFields);
    setIsEventOpen(true);
  }

  async function handleScan(memberId: string) {
    const normalizedId = memberId.trim();
    if (!eventId || !normalizedId || checkInPendingRef.current) return;

    const activeRoster = roster.length > 0 ? roster : loadCachedRoster();
    if (activeRoster.length > 0) {
      const rosterMember = findRosterMember(activeRoster, normalizedId);
      if (!rosterMember) {
        playBeep(440);
        showToast(`Member ${normalizedId} was not found`, "error");
        return;
      }

      const alreadyCheckedIn =
        members.some((member) => member.id === rosterMember.memberId) ||
        loadOutbox(eventId).some(
          (item) =>
            item.kind !== "delete" && item.memberId === rosterMember.memberId,
        );
      if (alreadyCheckedIn) {
        playBeep(440);
        showToast(`${rosterMember.name} is already checked in`, "error");
        return;
      }

      const queued = enqueueOutboxCheckIn(eventId, rosterMember);
      setJustSynced(false);
      setMembers((current) => [queued.memberSnapshot, ...current]);
      setPendingCount(loadOutbox(eventId).length);
      playBeep(880);
      showToast("Checked in", "success", {
        member: {
          id: queued.memberSnapshot.id,
          name: queued.memberSnapshot.name,
          initials: queued.memberSnapshot.initials,
          color: queued.memberSnapshot.color,
          pictureUrl: queued.memberSnapshot.pictureUrl,
        },
      });
      void triggerOutboxSync();
      return;
    }

    // Fallback when no roster is available locally.
    checkInPendingRef.current = true;
    setIsCheckInPending(true);
    try {
      const checkIn = await checkInMember(eventId, normalizedId);
      const member: Member = {
        checkInId: checkIn.checkInId,
        id: checkIn.id,
        name: checkIn.name,
        initials: getInitials(checkIn.name),
        date: getCurrentDate(),
        color: getAvatarColor(checkIn.name),
        email: checkIn.email,
        phone: checkIn.phone,
        address: checkIn.address,
        dob: checkIn.dob,
        pictureUrl: checkIn.pictureUrl,
        syncStatus: "synced",
      };
      setMembers((current) => [member, ...current]);
      playBeep(880);
      showToast("Checked in", "success", {
        member: {
          id: member.id,
          name: member.name,
          initials: member.initials,
          color: member.color,
          pictureUrl: member.pictureUrl,
        },
      });
    } catch (error) {
      playBeep(440);
      showToast(
        error instanceof Error ? error.message : "Unable to check in member",
        "error",
      );
    } finally {
      checkInPendingRef.current = false;
      setIsCheckInPending(false);
    }
  }

  const { isScanning, startScan, cancelScan, videoRef } = useQrScanner({
    onScan: handleScan,
    onMessage: showToast,
  });

  function handleManualEntry() {
    const memberId = window.prompt("Enter the member ID");
    if (memberId) void handleScan(memberId);
  }

  async function deleteMember(checkInId: string) {
    if (checkInId.startsWith("local-")) {
      removeOutboxCheckIn(checkInId);
      setMembers((current) =>
        current.filter((member) => member.checkInId !== checkInId),
      );
      setPendingCount(loadOutbox(eventId).length);
      showToast("Pending check-in removed", "success");
      return;
    }

    enqueueOutboxDelete(eventId, checkInId);
    setJustSynced(false);
    setMembers((current) =>
      current.filter((member) => member.checkInId !== checkInId),
    );
    setPendingCount(loadOutbox(eventId).length);
    showToast("Member removed from today’s check-ins", "success");
    void triggerOutboxSync();
  }

  async function downloadExcel() {
    setIsDownloading(true);
    let response: Response;
    try {
      response = await fetch(
        `/api/export/${encodeURIComponent(eventId || "event")}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: activeEvent,
            trackedFields: currentEvent?.trackedFields ?? defaultTrackedFields,
            members: members.map((member) => ({
              id: member.id,
              name: member.name,
              email: member.email ?? "",
              phone: member.phone ?? "",
              address: member.address ?? "",
              dob: member.dob ?? "",
              pictureUrl: member.pictureUrl ?? "",
              date: formatCheckInDate(member),
            })),
          }),
        },
      );
    } catch (error) {
      setIsDownloading(false);
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to connect to the export service",
        "error",
      );
      return;
    }

    if (!response.ok) {
      setIsDownloading(false);
      showToast("Unable to download attendance", "error");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeEvent.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-attendance.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    setIsDownloading(false);
    showToast("Attendance Excel file downloaded", "success");
  }

  async function saveCurrentEvent() {
    const nextEventName = eventName.trim();
    if (!nextEventName) {
      showToast("Add an event name to continue");
      return;
    }
    setIsSavingEvent(true);
    try {
      const savedId = await saveEvent({
        id: eventId || undefined,
        name: nextEventName,
        eventDate,
        trackedFields,
      });
      const wasActive = Boolean(activeEvent);
      setCurrentEvent({
        id: savedId,
        name: nextEventName,
        eventDate,
        trackedFields,
      });
      setIsEventOpen(false);
      showToast(
        wasActive
          ? "Event updated and ready for check-in"
          : "Event created and ready for check-in",
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to save event",
        "error",
      );
    } finally {
      setIsSavingEvent(false);
    }
  }

  async function deleteEvent() {
    if (!eventId) return;
    setIsDeletingEvent(true);
    try {
      await deleteEventAction(eventId);
      setCurrentEvent(null);
      setMembers([]);
      setIsAttendanceOpen(false);
      setIsDeleteEventOpen(false);
      setIsEventOpen(false);
      showToast("Event and check-in data deleted", "success");
      startTransition(() => router.push("/events"));
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to delete event",
        "error",
      );
    } finally {
      setIsDeletingEvent(false);
    }
  }

  const visibleMembers = members.filter((member) =>
    `${member.name} ${member.id}`.toLowerCase().includes(search.toLowerCase()),
  );
  const latestMember = members[0];

  return (
    <>
      {!currentEvent ? (
        <>
          <section className="flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-end sm:py-12">
            <div>
              <p className="mb-2 text-[15px] font-bold text-muted-foreground">
                Good morning, Jamie
              </p>
              <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-[-.03em]">
                Ready when you are.
              </h1>
            </div>
          </section>

          <section className="flex min-h-[45vh] items-center justify-center rounded-xl bg-card px-6 py-12 ring-1 ring-border">
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-tint text-primary">
                <Plus className="size-10" />
              </div>
              <Button size="lg" className="px-8" onClick={() => openEventDialog()}>
                New event
              </Button>
            </div>
          </section>
        </>
      ) : isAttendanceOpen ? (
        <AttendanceView
          activeEvent={activeEvent}
          members={members}
          trackedFields={currentEvent.trackedFields}
          isDownloading={isDownloading}
          onBack={() => setIsAttendanceOpen(false)}
          onDelete={deleteMember}
          onDownload={downloadExcel}
        />
      ) : (
        <>
          <section
            className="relative mt-6 mb-4 flex cursor-pointer items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-border transition-colors hover:ring-tint-strong sm:px-5"
            role="button"
            tabIndex={0}
            onClick={() => openEventDialog()}
            onKeyDown={(keyboardEvent) => {
              if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                keyboardEvent.preventDefault();
                openEventDialog();
              }
            }}
            aria-label={`Update ${activeEvent}`}
          >
            <span className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-tint text-primary sm:flex">
              <CalendarDays className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-accent-foreground">
                <span className="size-[7px] rounded-full bg-primary" />
                Active event
              </span>
              <h2 className="truncate font-heading text-xl font-extrabold leading-tight tracking-[-.02em]">
                {activeEvent}
              </h2>
              <p className="text-[15px] font-medium text-muted-foreground">
                <LocalDate
                  value={currentEvent.eventDate}
                  options={{
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }}
                />
              </p>
            </div>
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                openEventDialog();
              }}
            >
              <Pencil className="hidden sm:block" />
              Update event
            </Button>
          </section>

          {(!isOnline || pendingCount > 0 || isSyncingOutbox || justSynced) && (
            <div
              role="status"
              aria-live="polite"
              data-testid="outbox-status"
              className={`mb-4 flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 ${
                !isOnline || pendingCount > 0
                  ? "bg-[#fbeedd] text-[#83551c] ring-[#f0d5b1]"
                  : "bg-tint text-primary-strong ring-tint-strong"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {!isOnline ? (
                  <CloudOff className="size-4 shrink-0" aria-hidden="true" />
                ) : isSyncingOutbox ? (
                  <Loader2
                    className="size-4 shrink-0 animate-spin"
                    aria-hidden="true"
                  />
                ) : pendingCount > 0 ? (
                  <Clock className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Check className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {!isOnline
                    ? pendingCount > 0
                      ? `Offline · ${pendingCount} check-in${pendingCount === 1 ? "" : "s"} waiting to sync`
                      : "Offline · Scans saved locally"
                    : isSyncingOutbox
                      ? `Syncing ${pendingCount} check-in${pendingCount === 1 ? "" : "s"}...`
                      : pendingCount > 0
                        ? `${pendingCount} check-in${pendingCount === 1 ? "" : "s"} waiting to sync`
                        : "All check-ins synced"}
                </span>
              </span>
              {isOnline && pendingCount > 0 && !isSyncingOutbox && (
                <button
                  type="button"
                  onClick={() => void triggerOutboxSync()}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1 text-xs font-bold text-[#83551c] transition-colors hover:bg-white"
                >
                  <RefreshCw className="size-3" aria-hidden="true" />
                  Sync now
                </button>
              )}
            </div>
          )}

          <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-start">
            <div className="rounded-xl bg-primary p-5 text-primary-foreground lg:col-start-2 lg:row-start-1">
              <div className="flex items-center justify-between gap-3 text-[15px] font-semibold">
                <span>Attendance</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary-strong px-2.5 py-1 text-[13px] font-bold">
                  <span className="size-[7px] rounded-full bg-mint" />
                  Today&apos;s event
                </span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="flex items-baseline gap-2">
                  <strong className="font-heading text-[52px] font-extrabold leading-none tracking-[-.03em] tabular-nums">
                    {attendance}
                  </strong>
                  <span className="text-lg font-semibold">checked in</span>
                </p>
                <p className="text-right text-sm font-semibold leading-tight">
                  <strong className="block text-[22px] font-extrabold tabular-nums">
                    {memberCount}
                  </strong>
                  expected
                </p>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-primary-strong">
                <span
                  className="block h-full rounded-full bg-white transition-[width] duration-500"
                  style={{ width: `${attendancePercentage}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-semibold">
                {attendancePercentage}% of expected guests
              </p>
            </div>

            <div className="rounded-xl bg-card p-3 ring-1 ring-border sm:p-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
              <div className="flex items-center justify-between gap-3 px-1 pb-3">
                <div>
                  <span className="text-[13px] font-bold text-muted-foreground">
                    Door check-in
                  </span>
                  <p className="font-heading text-xl font-extrabold tracking-[-.02em]">
                    Scan a member
                  </p>
                </div>
                <span className="flex size-11 items-center justify-center rounded-full bg-tint text-primary">
                  <ScanLine className="size-5" />
                </span>
              </div>
              <div className="relative flex h-[min(60vw,300px)] min-h-[220px] items-center justify-center overflow-hidden rounded-lg bg-scanner">
                <div
                  id="qr-reader"
                  className="absolute inset-0 z-[1] h-full w-full"
                >
                  <video
                    ref={videoRef}
                    aria-label="Camera preview"
                    className={`h-full w-full rounded-lg object-cover ${
                      isScanning && !isCheckInPending ? "" : "hidden"
                    }`}
                    muted
                    playsInline
                  />
                </div>
                <span className="pointer-events-none absolute left-3 top-3 z-[3] inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[13px] font-semibold text-white">
                  <Camera className="size-3.5" />
                  {isScanning ? "Camera on" : "Camera off"}
                </span>
                {!isScanning && !isCheckInPending && (
                  <QrCode className="absolute left-1/2 top-1/2 z-10 size-14 -translate-x-1/2 -translate-y-1/2 stroke-[1.25] text-mint" />
                )}
                {isCheckInPending && (
                  <Loader2
                    aria-hidden
                    className="absolute left-1/2 top-1/2 z-10 size-12 -translate-x-1/2 -translate-y-1/2 animate-spin text-mint"
                  />
                )}
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-[2] size-[150px] -translate-x-1/2 -translate-y-1/2">
                  <span className="absolute left-0 top-0 size-7 rounded-tl-[10px] border-l-[3px] border-t-[3px] border-mint" />
                  <span className="absolute right-0 top-0 size-7 rounded-tr-[10px] border-r-[3px] border-t-[3px] border-mint" />
                  <span className="absolute bottom-0 left-0 size-7 rounded-bl-[10px] border-b-[3px] border-l-[3px] border-mint" />
                  <span className="absolute bottom-0 right-0 size-7 rounded-br-[10px] border-b-[3px] border-r-[3px] border-mint" />
                </div>
                <span
                  className={`pointer-events-none absolute z-[2] top-1/2 h-0.5 w-[130px] rounded-full bg-mint ${
                    isCheckInPending
                      ? "opacity-0"
                      : isScanning
                        ? "animate-pulse"
                        : "animate-scan-line"
                  }`}
                />
                {isScanning && !isCheckInPending && (
                  <p className="absolute bottom-4 z-20 m-0 text-[15px] font-semibold text-white drop-shadow-sm">
                    Center the QR in the frame…
                  </p>
                )}
                {isCheckInPending && (
                  <p
                    className="absolute bottom-4 z-20 m-0 text-[15px] font-semibold text-white"
                    role="status"
                    aria-live="polite"
                  >
                    Checking in...
                  </p>
                )}
              </div>
              <p className="mt-3 px-1 text-[15px] font-medium text-muted-foreground">
                Hold the member&apos;s QR code inside the frame.
              </p>
              <Button
                size="lg"
                className="mt-3 w-full"
                onClick={startScan}
                disabled={isScanning || isCheckInPending}
                loading={isCheckInPending}
              >
                {!isCheckInPending && <QrCode />}
                {isCheckInPending
                  ? "Checking in..."
                  : isScanning
                    ? "Looking for a code..."
                    : "Start camera"}
              </Button>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {isScanning && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full text-muted-foreground"
                    onClick={cancelScan}
                  >
                    Cancel scan
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="lg"
                  className={`w-full ${isScanning ? "" : "sm:col-span-2"}`}
                  onClick={handleManualEntry}
                  disabled={isCheckInPending}
                >
                  <Keyboard />
                  Enter member ID manually
                </Button>
              </div>
            </div>

            <div className="rounded-xl bg-card px-4 pb-2 pt-3 ring-1 ring-border lg:col-start-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-heading text-[17px] font-extrabold">
                  Recent check-ins
                </h3>
                <Button
                  variant="link"
                  className="h-11 gap-0.5 px-0 text-[15px] font-bold"
                  onClick={() => setIsAttendanceOpen(true)}
                >
                  View attendance
                  <ChevronRight className="size-[18px]" />
                </Button>
              </div>
              {latestMember ? (
                <ol>
                  {members.slice(0, 3).map((member, index, recent) => (
                    <li
                      key={member.checkInId}
                      className="grid min-h-16 grid-cols-[20px_1fr_auto] items-center gap-3"
                    >
                      <span
                        aria-hidden="true"
                        className="relative flex h-full items-center justify-center"
                      >
                        <span
                          className={`absolute w-0.5 bg-border ${
                            index === 0 ? "top-1/2" : "top-0"
                          } ${index === recent.length - 1 ? "bottom-1/2" : "bottom-0"}`}
                        />
                        <span className="relative size-3 rounded-full border-[3px] border-primary bg-card" />
                      </span>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          initials={member.initials}
                          color={member.color}
                          pictureUrl={member.pictureUrl}
                          alt={member.name}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <strong className="block truncate text-base font-bold leading-tight">
                            {member.name}
                          </strong>
                          <span className="block truncate text-sm font-medium text-muted-foreground tabular-nums">
                            Member ID · {member.id}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <time className="text-sm font-semibold text-muted-foreground tabular-nums">
                          {formatCheckInDate(member)}
                        </time>
                        {member.syncStatus === "pending" ? (
                          <span
                            className="inline-flex size-6 items-center justify-center rounded-full bg-[#fbeedd] text-[#83551c]"
                            aria-label="Pending sync"
                            title="Waiting to sync"
                          >
                            <Clock className="size-3.5" aria-hidden="true" />
                          </span>
                        ) : (
                          <span
                            className="inline-flex size-6 items-center justify-center rounded-full bg-tint text-primary"
                            aria-label="Synced"
                            title="Synced"
                          >
                            <Check className="size-3.5" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="pb-3 pt-1 text-[15px] text-muted-foreground">
                  No members checked in yet.
                </p>
              )}
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <h2 className="font-heading text-2xl font-extrabold tracking-[-.02em]">
                Checked in today
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search members"
                  aria-label="Search checked-in members"
                  value={search}
                  onChange={(changeEvent) =>
                    setSearch(changeEvent.target.value)
                  }
                  className="pl-10"
                />
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
              {visibleMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  trackedFields={currentEvent.trackedFields}
                  onDelete={deleteMember}
                  isLast={member === visibleMembers[visibleMembers.length - 1]}
                />
              ))}
              {visibleMembers.length === 0 && (
                <p className="px-5 py-8 text-center text-base text-muted-foreground">
                  No checked-in members match that search.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      <EventDialogs
        activeEvent={activeEvent}
        eventName={eventName}
        eventDate={eventDate}
        trackedFields={trackedFields}
        isEventOpen={isEventOpen}
        isDeleteEventOpen={isDeleteEventOpen}
        isSaving={isSavingEvent}
        isDeleting={isDeletingEvent}
        onEventOpenChange={setIsEventOpen}
        onDeleteOpenChange={setIsDeleteEventOpen}
        onEventNameChange={setEventName}
        onEventDateChange={setEventDate}
        onTrackedFieldsChange={setTrackedFields}
        onSave={saveCurrentEvent}
        onDeleteRequest={() => {
          setIsEventOpen(false);
          setIsDeleteEventOpen(true);
        }}
        onDelete={deleteEvent}
      />
    </>
  );
}
