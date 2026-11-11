"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, Plus, QrCode, Search, ShieldCheck } from "lucide-react";

import {
  checkInMember,
  deleteEvent as deleteEventAction,
  removeCheckIn,
  saveEvent,
} from "@/app/actions";
import type { DashboardData } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import AttendanceView, { Avatar, MemberRow } from "./attendance-view";
import EventDialogs from "./event-dialogs";
import {
  defaultTrackedFields,
  formatCheckInDate,
  getAvatarColor,
  getInitials,
  toMember,
} from "./member-utils";
import { useToast } from "./toast-provider";
import type { Member } from "./types";
import { useQrScanner } from "./use-qr-scanner";
import { getCurrentDate } from "@/lib/date";

export default function CheckInView({
  event,
  checkIns,
}: {
  event: DashboardData["event"];
  checkIns: DashboardData["checkIns"];
}) {
  const router = useRouter();
  const showToast = useToast();
  const [, startTransition] = useTransition();
  const [members, setMembers] = useState<Member[]>(() =>
    checkIns.map(toMember),
  );
  const [syncedCheckIns, setSyncedCheckIns] = useState(checkIns);
  const [currentEvent, setCurrentEvent] = useState(event);
  const [syncedEvent, setSyncedEvent] = useState(event);
  const [search, setSearch] = useState("");
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false);
  const [eventName, setEventName] = useState(event?.name ?? "");
  const [trackedFields, setTrackedFields] = useState(
    event?.trackedFields ?? defaultTrackedFields,
  );

  // Server data is the source of truth: adopt it whenever the route re-renders
  // (e.g. after a Server Action revalidates), keeping optimistic updates between.
  if (syncedCheckIns !== checkIns) {
    setSyncedCheckIns(checkIns);
    setMembers(checkIns.map(toMember));
  }
  if (syncedEvent !== event) {
    setSyncedEvent(event);
    setCurrentEvent(event);
  }

  const attendance = members.length;
  const activeEvent = currentEvent?.name ?? "";
  const eventId = currentEvent?.id ?? "";

  function openEventDialog() {
    setEventName(currentEvent?.name ?? "");
    setTrackedFields(currentEvent?.trackedFields ?? defaultTrackedFields);
    setIsEventOpen(true);
  }

  async function handleScan(memberId: string) {
    if (!eventId) return;
    try {
      const checkIn = await checkInMember(eventId, memberId);
      const member: Member = {
        checkInId: checkIn.checkInId,
        id: checkIn.id,
        name: checkIn.name,
        initials: getInitials(checkIn.name),
        date: getCurrentDate(),
        color: getAvatarColor(checkIn.name),
      };
      setMembers((current) => [member, ...current]);
      showToast(`${member.name} checked in`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to check in member",
      );
    }
  }

  const { isScanning, startScan, cancelScan } = useQrScanner({
    onScan: handleScan,
    onMessage: showToast,
  });

  function handleManualEntry() {
    const memberId = window.prompt("Enter the member ID");
    if (memberId) void handleScan(memberId);
  }

  async function deleteMember(checkInId: string) {
    try {
      await removeCheckIn(checkInId);
      setMembers((current) =>
        current.filter((member) => member.checkInId !== checkInId),
      );
      showToast("Member removed from today’s check-ins");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to remove check-in",
      );
    }
  }

  async function downloadExcel() {
    let response: Response;
    try {
      response = await fetch("/api/export/prototype", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: activeEvent,
          members: members.map((member) => ({
            id: member.id,
            name: member.name,
            date: formatCheckInDate(member),
          })),
        }),
      });
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to connect to the export service",
      );
      return;
    }

    if (!response.ok) {
      showToast("Unable to download attendance");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeEvent.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-attendance.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Attendance Excel file downloaded");
  }

  async function saveCurrentEvent() {
    const nextEventName = eventName.trim();
    if (!nextEventName) {
      showToast("Add an event name to continue");
      return;
    }
    try {
      const savedId = await saveEvent({
        id: eventId || undefined,
        name: nextEventName,
        trackedFields,
      });
      const wasActive = Boolean(activeEvent);
      setCurrentEvent({
        id: savedId,
        name: nextEventName,
        trackedFields,
      });
      setIsEventOpen(false);
      showToast(
        wasActive
          ? "Event updated and ready for check-in"
          : "Event created and ready for check-in",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to save event",
      );
    }
  }

  async function deleteEvent() {
    if (!eventId) return;
    try {
      await deleteEventAction(eventId);
      setCurrentEvent(null);
      setMembers([]);
      setIsAttendanceOpen(false);
      setIsDeleteEventOpen(false);
      setIsEventOpen(false);
      showToast("Event and check-in data deleted");
      startTransition(() => router.push("/events"));
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to delete event",
      );
    }
  }

  const visibleMembers = members.filter((member) =>
    `${member.name} ${member.id}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      {!currentEvent ? (
        <>
          <section className="flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-end sm:py-[51px]">
            <div>
              <p className="mb-2.5 text-sm font-bold uppercase tracking-[.11em] text-[#85858c]">
                Good morning, Jamie
              </p>
              <h1 className="font-sans text-4xl font-bold leading-none tracking-[-.05em]">
                Ready when you are.
              </h1>
            </div>
          </section>

          <section className="flex min-h-[45vh] items-center justify-center">
            <div className="flex flex-col items-center gap-5">
              <div className="flex size-20 items-center justify-center rounded-full bg-[#f1f1f6] text-[#17171a]">
                <Plus className="size-10" />
              </div>
              <Button
                className="h-12 px-8 text-base font-bold shadow-[0_12px_24px_rgba(23,23,26,.14)]"
                onClick={() => openEventDialog()}
              >
                New event
              </Button>
            </div>
          </section>
        </>
      ) : isAttendanceOpen ? (
        <AttendanceView
          activeEvent={activeEvent}
          members={members}
          onBack={() => setIsAttendanceOpen(false)}
          onDelete={deleteMember}
          onDownload={downloadExcel}
        />
      ) : (
        <>
          <section
            className="relative mt-10 mb-6 flex cursor-pointer flex-col gap-4 rounded-[13px] border border-[#e7e7ea] bg-white p-4 shadow-[0_12px_35px_rgba(27,27,42,.06)] transition-shadow hover:shadow-[0_14px_38px_rgba(27,27,42,.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b5ce2] sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-[17px]"
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
            <div className="flex items-center gap-3">
              <span className="size-[17px] rounded-full border-4 border-[#dff3e8] bg-[#32a06c]" />
              <div>
                <span className="mb-1 block text-xs font-bold uppercase tracking-[.11em] text-[#85858c]">
                  Active event
                </span>
                <h2 className="text-lg font-bold tracking-[-.02em]">
                  {activeEvent}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#85858c]">
              <span className="hidden sm:inline">
                Tuesday, 18 June 2024 · 10:00 AM
              </span>
              <Separator
                orientation="vertical"
                className="h-4 bg-[#e7e7ea]"
              />
              <span className="hidden sm:inline">Community Room</span>
              <Button
                variant="ghost"
                className="text-sm font-semibold text-[#5b5ce2] hover:bg-[#f1f1f6] hover:text-[#4748c5]"
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  openEventDialog();
                }}
              >
                Update event
              </Button>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.28fr_1fr]">
            <Card className="rounded-[15px] border-[#e7e7ea] shadow-[0_12px_35px_rgba(27,27,42,.06)]">
              <CardHeader className="flex flex-row items-start justify-between p-6 pb-0">
                <div>
                  <span className="text-sm font-bold uppercase tracking-[.11em] text-[#85858c]">
                    Door check-in
                  </span>
                  <CardTitle className="mt-2 text-2xl font-bold tracking-[-.045em]">
                    Scan a member
                  </CardTitle>
                </div>
                <Badge className="bg-[#f0f7f3] text-sm font-semibold text-[#32a06c] hover:bg-[#f0f7f3]">
                  <ShieldCheck className="size-3" /> Secure
                </Badge>
              </CardHeader>
              <CardContent className="p-6">
                <div
                  className={`relative my-1 flex h-[211px] items-center justify-center overflow-hidden rounded-[11px] bg-gradient-to-br from-[#eeefff] via-[#f7f7ff] to-[#fdf1ef] ${
                    isScanning ? "animate-pulse" : ""
                  }`}
                >
                  <div
                    id="qr-reader"
                    className="absolute inset-0 h-full w-full"
                  />
                  <div className="absolute size-[126px] rounded-full border border-[#5b5ce2]/20" />
                  {!isScanning && (
                    <QrCode className="relative z-10 size-12 stroke-1 text-[#5b5ce2]" />
                  )}
                  <span className="absolute left-6 top-6 h-[17px] w-[17px] border-l-2 border-t-2 border-[#7778e0]" />
                  <span className="absolute right-6 top-6 h-[17px] w-[17px] border-r-2 border-t-2 border-[#7778e0]" />
                  <span className="absolute bottom-6 left-6 h-[17px] w-[17px] border-b-2 border-l-2 border-[#7778e0]" />
                  <span className="absolute bottom-6 right-6 h-[17px] w-[17px] border-b-2 border-r-2 border-[#7778e0]" />
                  <span
                    className={`absolute top-[42%] h-px w-[70%] bg-gradient-to-r from-transparent via-[#5b5ce2] to-transparent ${
                      isScanning ? "animate-pulse" : "animate-scan-line"
                    }`}
                  />
                  {isScanning && (
                    <p className="absolute bottom-[17px] m-0 text-sm text-[#7777a3]">
                      Looking for a code...
                    </p>
                  )}
                </div>
                <Button
                  className="mt-[18px] h-auto w-full bg-[#5b5ce2] py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(91,92,226,.2)] hover:bg-[#4748c5]"
                  onClick={startScan}
                  disabled={isScanning}
                >
                  <QrCode className="size-4" />
                  {isScanning ? "Looking for a code..." : "Start camera"}
                </Button>
                {isScanning && (
                  <Button
                    variant="ghost"
                    className="mx-auto mt-2 block h-auto text-sm text-[#85858c]"
                    onClick={cancelScan}
                  >
                    Cancel scan
                  </Button>
                )}
                <Button
                  variant="link"
                  className="mx-auto mt-2 block h-auto p-0 text-sm font-normal text-[#85858c]"
                  onClick={handleManualEntry}
                >
                  Enter member ID manually
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[15px] border-[#e7e7ea] shadow-[0_12px_35px_rgba(27,27,42,.06)]">
              <CardHeader className="flex flex-row items-start justify-between p-6 pb-0">
                <div>
                  <span className="text-sm font-bold uppercase tracking-[.11em] text-[#85858c]">
                    Today&apos;s event
                  </span>
                  <CardTitle className="mt-2 text-2xl font-bold tracking-[-.045em]">
                    Attendance
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="More options"
                >
                  <Ellipsis />
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-5 mt-2 flex items-baseline gap-2">
                  <strong className="text-[60px] font-bold leading-[.8] tracking-[-.08em]">
                    {attendance}
                  </strong>
                  <span className="text-sm text-[#85858c]">
                    members checked in
                  </span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-[#ededf2]">
                  <span className="block h-full w-[62%] rounded-full bg-gradient-to-r from-[#5b5ce2] to-[#8d8eea]" />
                </div>
                <div className="mt-2 flex justify-between text-sm text-[#85858c]">
                  <span>62% of expected guests</span>
                  <strong className="font-semibold text-[#5d5d65]">
                    39 expected
                  </strong>
                </div>
                <Separator className="my-7 bg-[#e7e7ea]" />
                <div className="flex items-center gap-2.5">
                  <Avatar
                    initials="AW"
                    color="bg-[#dff3e8] text-[#32825d]"
                  />
                  <div>
                    <span className="mb-1 block text-xs text-[#85858c]">
                      Last check-in
                    </span>
                    <strong className="block text-base">
                      Alex Williams
                    </strong>
                  </div>
                  <time className="ml-auto text-xs text-[#85858c]">
                    2024-06-18
                  </time>
                </div>
                <Button
                  variant="link"
                  className="mt-6 h-auto p-0 text-sm font-bold text-[#5b5ce2]"
                  onClick={() => setIsAttendanceOpen(true)}
                >
                  View attendance <span className="ml-1 text-base">→</span>
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="mt-10">
            <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="text-sm font-bold uppercase tracking-[.11em] text-[#85858c]">
                  Recent activity
                </span>
                <h2 className="mt-2 text-2xl font-bold tracking-[-.045em]">
                  Checked in today
                </h2>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 size-4 text-[#85858c]" />
                <Input
                  type="search"
                  placeholder="Search members"
                  aria-label="Search checked-in members"
                  value={search}
                  onChange={(changeEvent) => setSearch(changeEvent.target.value)}
                  className="h-9 rounded-lg border-[#e7e7ea] bg-white pl-8 text-sm"
                />
              </div>
            </div>
            <div className="overflow-hidden rounded-[13px] border border-[#e7e7ea] bg-white shadow-[0_12px_35px_rgba(27,27,42,.06)]">
              {visibleMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onDelete={deleteMember}
                  isLast={
                    member === visibleMembers[visibleMembers.length - 1]
                  }
                />
              ))}
              {visibleMembers.length === 0 && (
                <p className="px-5 py-8 text-center text-base text-[#85858c]">
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
        trackedFields={trackedFields}
        isEventOpen={isEventOpen}
        isDeleteEventOpen={isDeleteEventOpen}
        onEventOpenChange={setIsEventOpen}
        onDeleteOpenChange={setIsDeleteEventOpen}
        onEventNameChange={setEventName}
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
