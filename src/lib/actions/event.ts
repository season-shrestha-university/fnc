"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EventRecord, TrackedField } from "@/types/database";
import { getCurrentDate } from "@/lib/date";

const trackedFieldValues: TrackedField[] = [
  "member_id",
  "name",
  "address",
  "dob",
  "picture_url",
];

function isTrackedField(value: unknown): value is TrackedField {
  return (
    typeof value === "string" &&
    trackedFieldValues.includes(value as TrackedField)
  );
}

export async function getActiveEvent(): Promise<EventRecord | null> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    ...data,
    tracked_fields: Array.isArray(data.tracked_fields)
      ? data.tracked_fields.filter(isTrackedField)
      : [],
  };
}

export async function upsertEvent(formData: FormData) {
  const supabase = await getSupabaseServerClient();
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Event name is required");
  }

  const eventDate =
    typeof formData.get("event_date") === "string" &&
    formData.get("event_date")
      ? String(formData.get("event_date"))
      : getCurrentDate();
  const trackedFields = formData
    .getAll("tracked_fields")
    .filter(isTrackedField);
  const event = {
    name: name.trim(),
    event_date: eventDate,
    tracked_fields: trackedFields.length
      ? trackedFields
      : (["member_id", "name"] as TrackedField[]),
  };

  const existingEvent = await getActiveEvent();

  if (existingEvent) {
    const { error } = await supabase
      .from("events")
      .update(event)
      .eq("id", existingEvent.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("events").insert(event);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  redirect("/");
}

export async function deleteEvent(eventId: string) {
  if (!eventId) throw new Error("Event ID is required");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}
