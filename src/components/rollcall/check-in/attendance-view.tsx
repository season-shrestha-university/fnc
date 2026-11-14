"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Check, Download, Loader2, Search } from "lucide-react";
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
        className="mb-8 gap-2 px-0 text-sm text-[#5b5ce2] hover:bg-transparent"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        Back to check-in
      </Button>
      <div className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <span className="text-sm font-bold uppercase tracking-[.11em] text-[#85858c]">
            Attendance review
          </span>
          <h1 className="mt-2 text-4xl font-bold tracking-[-.05em]">
            {activeEvent}
          </h1>
          <p className="mt-2 text-sm text-[#85858c]">
            {members.length} member{members.length === 1 ? "" : "s"} checked in
          </p>
        </div>
        <Button
          className="h-10 w-full gap-2 bg-[#5b5ce2] px-5 text-sm font-bold text-white hover:bg-[#4748c5] sm:w-auto"
          onClick={onDownload}
          loading={isDownloading}
        >
          {!isDownloading && <Download className="size-4" />}
          {isDownloading ? "Downloading..." : "Download Excel"}
        </Button>
      </div>
      <div className="relative mb-4 w-full sm:w-56">
        <Search className="absolute left-2.5 top-2 size-4 text-[#85858c]" />
        <Input
          type="search"
          placeholder="Search members"
          aria-label="Search attendance"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 rounded-lg border-[#e7e7ea] bg-white pl-8 text-sm"
        />
      </div>
      <div className="overflow-hidden rounded-[13px] border border-[#e7e7ea] bg-white shadow-[0_12px_35px_rgba(27,27,42,.06)]">
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
          <p className="px-5 py-8 text-center text-base text-[#85858c]">
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
      className={`relative overflow-hidden bg-[#fbe9e8] ${
        isLast ? "" : "border-b border-[#f0f0f2]"
      }`}
      aria-busy={isDeleting}
    >
      <div
        className="absolute inset-y-0 right-0 flex w-[120px] items-center justify-center bg-[#e76b60] text-sm font-semibold text-white"
        aria-hidden={!isDeleting}
      >
        {isDeleting ? (
          <Loader2
            className="size-6 animate-spin"
            aria-label="Removing check-in"
          />
        ) : (
          "Delete"
        )}
      </div>
      <div
        className={`relative flex items-center gap-3 bg-white px-5 py-3.5 ${
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
          <strong className="block text-sm">{member.name}</strong>
          <span className="mt-1 block text-sm text-[#85858c]">
            Member ID · {member.id}
          </span>
          {detailParts.length > 0 && (
            <span className="mt-0.5 block truncate text-xs text-[#85858c]">
              {detailParts.join(" · ")}
            </span>
          )}
        </div>
        <time className="text-sm text-[#85858c]">
          {member.createdDate ?? member.date}
        </time>
        <span className="flex size-[19px] items-center justify-center rounded-full bg-[#e1f4e9] text-[#32a06c]">
          <Check className="size-3" />
        </span>
      </div>
    </div>
  );
}

export function Avatar({
  initials,
  color = "bg-[#e4e3fb] text-[#5551aa]",
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
  const resolvedSize = size ?? (small ? "sm" : "md");
  const sizeClass =
    resolvedSize === "sm"
      ? "size-9 text-xs"
      : resolvedSize === "lg"
        ? "size-16 text-lg"
        : "size-12 text-base";

  if (pictureUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pictureUrl}
        alt={alt}
        className={`shrink-0 rounded-full object-cover ${sizeClass}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sizeClass} ${color}`}
    >
      {initials}
    </div>
  );
}
