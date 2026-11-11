"use server";

import { cacheLife, cacheTag, revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentDate, toDateOnly } from "@/lib/date";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardData = {
  event: {
    id: string;
    name: string;
    trackedFields: string[];
  } | null;
  memberCount: number;
  checkIns: Array<{
    checkInId: string;
    id: string;
    name: string;
    createdDate: string;
  }>;
};

export type EventSummary = {
  id: string;
  name: string;
  eventDate: string;
  participantCount: number;
  memberCount: number;
  attendancePercentage: number;
};

export type DirectoryMember = {
  id: string;
  memberId: string;
  name: string;
};

export type CreateMemberInput = {
  memberId?: string;
  name: string;
  address?: string;
  dob?: string;
  pictureUrl?: string;
};

function getErrorMessage(error: { message?: string } | null) {
  return error?.message || "Supabase request failed";
}

function invalidateWorkspaceData() {
  updateTag("events");
  updateTag("members");
  updateTag("check-ins");
  revalidatePath("/", "layout");
}

async function getAuthenticatedSupabase() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    throw new Error(getErrorMessage(error));
  }
  if (!user) redirect("/login");

  return supabase;
}

export async function getDashboardData(
  eventId?: string,
): Promise<DashboardData> {
  "use cache: private";
  cacheTag("events", "check-ins", "members");
  cacheLife({ stale: 60 });

  const supabase = await getAuthenticatedSupabase();
  let eventQuery = supabase.from("events").select("id, name, tracked_fields");
  if (eventId) {
    eventQuery = eventQuery.eq("id", eventId);
  } else {
    eventQuery = eventQuery.order("event_date", { ascending: false });
  }
  const { data: event, error: eventError } = await eventQuery
    .limit(1)
    .maybeSingle();

  if (eventError) throw new Error(getErrorMessage(eventError));
  if (!event) return { event: null, memberCount: 0, checkIns: [] };

  const { data: checkIns, error: checkInsError } = await supabase
    .from("check_ins")
    .select("id, member_id, created_at")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });

  if (checkInsError) throw new Error(getErrorMessage(checkInsError));

  const memberIds = (checkIns ?? []).map((checkIn) => checkIn.member_id);
  const [{ data: members, error: membersError }, { count: memberCount, error: memberCountError }] =
    await Promise.all([
      memberIds.length
        ? supabase
            .from("members")
            .select("id, member_id, name")
            .in("id", memberIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("members").select("id", { count: "exact", head: true }),
    ]);
  if (membersError) throw new Error(getErrorMessage(membersError));
  if (memberCountError) throw new Error(getErrorMessage(memberCountError));

  const membersById = new Map(
    (members ?? []).map((member) => [member.id, member]),
  );

  return {
    event: {
      id: event.id,
      name: event.name,
      trackedFields: Array.isArray(event.tracked_fields)
        ? event.tracked_fields.filter(
            (field): field is string => typeof field === "string",
          )
        : [],
    },
    memberCount: memberCount ?? 0,
    checkIns: (checkIns ?? []).flatMap((checkIn) => {
      const member = membersById.get(checkIn.member_id);
      if (!member) return [];
      return {
        checkInId: checkIn.id,
        id: member.member_id,
        name: member.name,
        createdDate: toDateOnly(checkIn.created_at),
      };
    }),
  };
}

export async function getEvents(): Promise<EventSummary[]> {
  "use cache: private";
  cacheTag("events", "check-ins", "members");
  cacheLife({ stale: 60 });

  const supabase = await getAuthenticatedSupabase();
  const [
    { data: events, error: eventsError },
    { data: checkIns, error: checkInsError },
    { data: members, error: membersError },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, event_date")
      .order("event_date", { ascending: false }),
    supabase.from("check_ins").select("event_id"),
    supabase.from("members").select("id"),
  ]);

  if (eventsError) throw new Error(getErrorMessage(eventsError));
  if (checkInsError) throw new Error(getErrorMessage(checkInsError));
  if (membersError) throw new Error(getErrorMessage(membersError));

  const checkInsByEvent = new Map<string, number>();
  for (const checkIn of checkIns ?? []) {
    checkInsByEvent.set(
      checkIn.event_id,
      (checkInsByEvent.get(checkIn.event_id) ?? 0) + 1,
    );
  }

  const memberCount = members?.length ?? 0;
  return (events ?? []).map((event) => {
    const participantCount = checkInsByEvent.get(event.id) ?? 0;
    return {
      id: event.id,
      name: event.name,
      eventDate: toDateOnly(event.event_date),
      participantCount,
      memberCount,
      attendancePercentage: memberCount
        ? Math.round((participantCount / memberCount) * 100)
        : 0,
    };
  });
}

export async function getMembers(): Promise<DirectoryMember[]> {
  "use cache: private";
  cacheTag("members");
  cacheLife({ stale: 60 });

  const { data, error } = await (await getAuthenticatedSupabase())
    .from("members")
    .select("id, member_id, name")
    .order("name", { ascending: true });

  if (error) throw new Error(getErrorMessage(error));

  return (data ?? []).map((member) => ({
    id: member.id,
    memberId: member.member_id,
    name: member.name,
  }));
}

export async function createMember(
  input: CreateMemberInput,
): Promise<DirectoryMember> {
  const name = input.name.trim();
  if (!name) throw new Error("Member name is required");

  const memberId =
    input.memberId?.trim() ||
    `FNC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const supabase = await getAuthenticatedSupabase();
  const { data, error } = await supabase
    .from("members")
    .insert({
      member_id: memberId,
      name,
      address: input.address?.trim() || "",
      dob: input.dob || null,
      picture_url: input.pictureUrl?.trim() || "",
    })
    .select("id, member_id, name")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Member ID ${memberId} is already in use`);
    }
    throw new Error(getErrorMessage(error));
  }

  invalidateWorkspaceData();
  return { id: data.id, memberId: data.member_id, name: data.name };
}

export async function saveEvent(input: {
  id?: string;
  name: string;
  trackedFields: string[];
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Event name is required");

  const supabase = await getAuthenticatedSupabase();
  if (input.id) {
    const { error } = await supabase
      .from("events")
      .update({
        name,
        tracked_fields: input.trackedFields,
      })
      .eq("id", input.id);
    if (error) throw new Error(getErrorMessage(error));
    invalidateWorkspaceData();
    return input.id;
  }

  const id = crypto.randomUUID();
  const { error } = await supabase.from("events").insert({
    id,
    name,
    event_date: getCurrentDate(),
    tracked_fields: input.trackedFields,
  });
  if (error) throw new Error(getErrorMessage(error));
  invalidateWorkspaceData();
  return id;
}

export async function deleteEvent(eventId: string) {
  if (!eventId) throw new Error("Event ID is required");

  const { error } = await (await getAuthenticatedSupabase())
    .from("events")
    .delete()
    .eq("id", eventId);
  if (error) throw new Error(getErrorMessage(error));
  invalidateWorkspaceData();
}

export async function checkInMember(eventId: string, memberId: string) {
  if (!eventId || !memberId.trim()) throw new Error("Member ID is required");

  const supabase = await getAuthenticatedSupabase();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, member_id, name")
    .eq("member_id", memberId.trim())
    .maybeSingle();
  if (memberError) throw new Error(getErrorMessage(memberError));
  if (!member) throw new Error(`Member ${memberId.trim()} was not found`);

  const { data: existing, error: existingError } = await supabase
    .from("check_ins")
    .select("id")
    .eq("event_id", eventId)
    .eq("member_id", member.id)
    .maybeSingle();
  if (existingError) throw new Error(getErrorMessage(existingError));
  if (existing) throw new Error(`${member.name} is already checked in`);

  const { data: checkIn, error: checkInError } = await supabase
    .from("check_ins")
    .insert({ event_id: eventId, member_id: member.id })
    .select("id, created_at")
    .single();
  if (checkInError) throw new Error(getErrorMessage(checkInError));

  invalidateWorkspaceData();
  return {
    checkInId: checkIn.id,
    id: member.member_id,
    name: member.name,
    createdDate: toDateOnly(checkIn.created_at),
  };
}

export async function removeCheckIn(checkInId: string) {
  if (!checkInId) throw new Error("Check-in ID is required");

  const { error } = await (await getAuthenticatedSupabase())
    .from("check_ins")
    .delete()
    .eq("id", checkInId);
  if (error) throw new Error(getErrorMessage(error));
  invalidateWorkspaceData();
}
