"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  Download,
  Search,
} from "lucide-react";
import { useSwipeable } from "react-swipeable";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defaultTrackedFields } from "@/components/rollcall/shared/member-utils";
import type { Member } from "@/components/rollcall/shared/types";

export default function AttendanceView({
  activeEvent,
  members,
  trackedFields = defaultTrackedFields,
  isDownloading = false,
  onBack,
  onDelete,
  onDownload,
}: {
  activeEvent: string;
  members: Member[];
  trackedFields?: string[];
  isDownloading?: boolean;
  onBack: () => void;
  onDelete: (checkInId: string) => Promise<void>;
  onDownload: () => void;
}) {
  const [search, setSearch] = useState("");
  const visibleMembers = members.filter((member) =>
    `${member.name} ${member.id}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="py-8 sm:py-12">
      <Button
        variant="ghost"
        className="mb-6 gap-2 rounded-full pl-2 pr-4 text-[15px] font-bold text-primary hover:bg-tint hover:text-primary-strong"
        onClick={onBack}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-card ring-1 ring-border">
          <ArrowLeft className="size-4" />
        </span>
        Back to check-in
      </Button>
      <div className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <span className="text-[15px] font-bold text-muted-foreground">
            Attendance review
          </span>
          <h1 className="mt-1 font-heading text-4xl font-extrabold tracking-[-.03em]">
            {activeEvent}
          </h1>
          <p className="mt-2 text-base font-medium text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"} checked in
          </p>
        </div>
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={onDownload}
          loading={isDownloading}
        >
          {!isDownloading && <Download />}
          {isDownloading ? "Downloading..." : "Download Excel"}
        </Button>
      </div>
      <div className="relative mb-4 w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search members"
          aria-label="Search attendance"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-10"
        />
      </div>
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
        {visibleMembers.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            trackedFields={trackedFields}
            onDelete={onDelete}
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
  );
}

export function MemberRow({
  member,
  trackedFields = defaultTrackedFields,
  onDelete,
  isLast,
}: {
  member: Member;
  trackedFields?: string[];
  onDelete: (checkInId: string) => Promise<void>;
  isLast: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deletePendingRef = useRef(false);
  const swipeHandlers = useSwipeable({
    trackMouse: true,
    preventScrollOnSwipe: true,
    onSwipeStart: () => {
      if (!deletePendingRef.current) setIsDragging(true);
    },
    onSwiping: ({ deltaX, dir }) => {
      if (deletePendingRef.current) return;
      if (dir === "Left") setOffset(Math.max(-120, Math.min(0, deltaX)));
    },
    onSwipedLeft: ({ absX }) => {
      setIsDragging(false);
      if (absX >= 80 && !deletePendingRef.current) {
        deletePendingRef.current = true;
        setOffset(-120);
        setIsDeleting(true);
        void onDelete(member.checkInId).catch(() => {
          deletePendingRef.current = false;
          setIsDeleting(false);
          setOffset(0);
        });
      } else if (!deletePendingRef.current) {
        setOffset(0);
      }
    },
    onSwiped: () => {
      setIsDragging(false);
      if (!deletePendingRef.current) {
        setOffset(0);
      }
    },
  });

  const detailParts: string[] = [];
  if (trackedFields.includes("Email") && member.email) {
    detailParts.push(member.email);
  }
  if (trackedFields.includes("Phone") && member.phone) {
    detailParts.push(member.phone);
  }
  if (trackedFields.includes("Address") && member.address) {
    detailParts.push(member.address);
  }
  if (trackedFields.includes("Date of birth") && member.dob) {
    detailParts.push(`DOB: ${member.dob}`);
  }

  return (
    <div
      className={`relative overflow-hidden bg-destructive-tint ${
        isLast ? "" : "border-b border-border"
      }`}
      aria-busy={isDeleting}
    >
      <div
        className="absolute inset-y-0 right-0 flex w-[120px] items-center justify-center bg-destructive text-[15px] font-bold text-white"
        aria-hidden={!isDeleting}
      >
        {isDeleting ? (
          <span className="pending-pulse" aria-label="Removing check-in">
            Removing…
          </span>
        ) : (
          "Delete"
        )}
      </div>
      <div
        className={`relative flex min-h-[72px] items-center gap-3 bg-card px-4 py-3 sm:px-5 ${
          isDeleting ? "pointer-events-none opacity-60" : ""
        }`}
        style={{
          touchAction: isDeleting ? "none" : "pan-y",
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 180ms ease-out",
        }}
        {...(isDeleting ? {} : swipeHandlers)}
      >
        <Avatar
          initials={member.initials}
          color={member.color}
          pictureUrl={member.pictureUrl}
          alt={member.name}
        />
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-base font-bold leading-tight">
            {member.name}
          </strong>
          <span className="mt-0.5 block text-sm font-medium text-muted-foreground tabular-nums">
            Member ID · {member.id}
          </span>
          {detailParts.length > 0 && (
            <span className="mt-0.5 block truncate text-sm text-muted-foreground">
              {detailParts.join(" · ")}
            </span>
          )}
        </div>
        <time className="shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">
          {member.createdDate ?? member.date}
        </time>
        {member.syncStatus === "pending" ? (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fbeedd] text-[#83551c]"
            aria-label="Pending sync"
            title="Waiting to sync"
          >
            <Clock className="size-[16px]" aria-hidden="true" />
          </span>
        ) : (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tint text-primary"
            aria-label="Synced"
            title="Synced"
          >
            <Check className="size-[17px]" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}

export function Avatar({
  initials,
  color = "bg-tint text-primary-strong",
  small = false,
  size,
  pictureUrl,
  alt = "",
}: {
  initials: string;
  color?: string;
  small?: boolean;
  size?: "sm" | "md" | "lg";
  pictureUrl?: string;
  alt?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const resolvedSize = size ?? (small ? "sm" : "md");
  const sizeClass =
    resolvedSize === "sm"
      ? "size-10 text-sm"
      : resolvedSize === "lg"
        ? "size-16 text-lg"
        : "size-12 text-base";

  if (pictureUrl && failedUrl !== pictureUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pictureUrl}
        alt={alt}
        className={`shrink-0 rounded-full object-cover ${sizeClass}`}
        onError={() => setFailedUrl(pictureUrl)}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${sizeClass} ${color}`}
    >
      {initials}
    </div>
  );
}
