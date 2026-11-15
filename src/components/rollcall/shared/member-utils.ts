import type { DashboardData } from "@/app/actions";
import type { Member } from "./types";

const avatarColors = [
  "bg-[#e3f2ef] text-[#0b5e52]",
  "bg-[#fbeedd] text-[#83551c]",
  "bg-[#e1edf5] text-[#2c5a77]",
];

export const trackedFieldOptions = [
  "Name",
  "Member ID",
  "Email",
  "Phone",
  "Address",
  "Date of birth",
  "Photo",
] as const;

export const requiredTrackedFields = ["Name", "Member ID"] as const;

export const defaultTrackedFields = ["Name", "Member ID"];

export function getAvatarColor(name: string) {
  const hash = [...name].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  return avatarColors[hash % avatarColors.length];
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatCheckInDate(
  member: Pick<Member, "date" | "createdDate">,
) {
  return member.createdDate ?? member.date;
}

export function toMember(
  checkIn: DashboardData["checkIns"][number] & {
    email?: string;
    phone?: string;
    address?: string;
    dob?: string;
    pictureUrl?: string;
  },
): Member {
  return {
    checkInId: checkIn.checkInId,
    id: checkIn.id,
    name: checkIn.name,
    initials: getInitials(checkIn.name),
    date: "",
    createdDate: checkIn.createdDate,
    color: getAvatarColor(checkIn.name),
    email: checkIn.email,
    phone: checkIn.phone,
    address: checkIn.address,
    dob: checkIn.dob,
    pictureUrl: checkIn.pictureUrl,
  };
}
