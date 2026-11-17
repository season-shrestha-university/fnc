import {
  requiredTrackedFields,
  trackedFieldOptions,
} from "@/components/rollcall/shared/member-utils";

export type EventWizardStep = "basics" | "fields" | "done";
export type EventEditSection = "basics" | "fields";

export type EventFormValues = {
  name: string;
  eventDate: string;
  trackedFields: string[];
};

export type EventFormErrors = {
  name?: string;
  form?: string;
};

export type EditEventSnapshot = EventFormValues;
export type EventEditDirtyMap = Record<EventEditSection, boolean>;

export const EVENT_EDIT_SECTIONS: EventEditSection[] = ["basics", "fields"];

export const EVENT_STEP_META: Record<
  Exclude<EventWizardStep, "done">,
  { number: 1 | 2; label: string }
> = {
  basics: { number: 1, label: "Basics" },
  fields: { number: 2, label: "Check-in fields" },
};

export const optionalTrackedFieldOptions = trackedFieldOptions.filter(
  (field) => !(requiredTrackedFields as readonly string[]).includes(field),
);

/** Ensures required tracked fields are always included in canonical option order. */
export function normalizeTrackedFields(fields: string[]): string[] {
  const selected = new Set(fields);
  for (const required of requiredTrackedFields) {
    selected.add(required);
  }
  return trackedFieldOptions.filter((field) => selected.has(field));
}

function getOptionalTrackedFieldSet(fields: string[]): Set<string> {
  const required = new Set<string>(requiredTrackedFields);
  return new Set(fields.filter((field) => !required.has(field)));
}

export function hasAnyOptionalTrackedField(fields: string[]): boolean {
  return getOptionalTrackedFieldSet(fields).size > 0;
}

export function hasCreateUnsavedChanges(
  values: EventFormValues,
  initialDate: string,
): boolean {
  return (
    Boolean(values.name.trim()) ||
    values.eventDate !== initialDate ||
    hasAnyOptionalTrackedField(values.trackedFields)
  );
}

export function getEventEditDirtyMap(
  snapshot: EditEventSnapshot,
  values: EventFormValues,
): EventEditDirtyMap {
  const snapshotOptional = getOptionalTrackedFieldSet(snapshot.trackedFields);
  const currentOptional = getOptionalTrackedFieldSet(values.trackedFields);

  const fieldsDirty =
    snapshotOptional.size !== currentOptional.size ||
    [...snapshotOptional].some((field) => !currentOptional.has(field));

  return {
    basics:
      values.name.trim() !== snapshot.name.trim() ||
      values.eventDate !== snapshot.eventDate,
    fields: fieldsDirty,
  };
}

export function isEventEditDirty(dirty: EventEditDirtyMap): boolean {
  return dirty.basics || dirty.fields;
}

export function validateEventName(name: string): string | undefined {
  return name.trim() ? undefined : "Give the event a name";
}

/** Parses a YYYY-MM-DD string into a local calendar Date without UTC shift. */
export function parseEventDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }
  return parsed;
}

/** Formats a local calendar Date back to YYYY-MM-DD. */
export function toEventDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Formats a YYYY-MM-DD calendar date without shifting across time zones. */
export function formatEventDate(value: string): string {
  const datePart = value.slice(0, 10);
  const parsed = new Date(`${datePart}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
