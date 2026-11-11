"use client";

import { Suspense, use, useState } from "react";

import { saveEvent } from "@/app/actions";
import type { EventSummary } from "@/app/actions";
import EventDialogs from "@/components/rollcall/events/event-dialogs";
import { EventsChrome, EventsGrid } from "@/components/rollcall/events/events-list";
import { useToast } from "@/components/rollcall/layout/toast-provider";
import { defaultTrackedFields } from "@/components/rollcall/shared/member-utils";
import { EventsGridSkeleton } from "@/components/rollcall/shared/workspace-skeleton";

function ResolvedEventsGrid({
  eventsPromise,
  query,
  onCreate,
}: {
  eventsPromise: Promise<EventSummary[]>;
  query: string;
  onCreate: () => void;
}) {
  const events = use(eventsPromise);
  return <EventsGrid events={events} query={query} onCreate={onCreate} />;
}

export default function EventsView({
  events,
  eventsPromise,
}: {
  events?: EventSummary[];
  eventsPromise?: Promise<EventSummary[]>;
}) {
  const showToast = useToast();
  const [query, setQuery] = useState("");
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [eventName, setEventName] = useState("");
  const [trackedFields, setTrackedFields] = useState(defaultTrackedFields);

  function openCreateDialog() {
    setEventName("");
    setTrackedFields(defaultTrackedFields);
    setIsEventOpen(true);
  }

  async function createEvent() {
    const nextEventName = eventName.trim();
    if (!nextEventName) {
      showToast("Add an event name to continue");
      return;
    }
    try {
      await saveEvent({ name: nextEventName, trackedFields });
      setIsEventOpen(false);
      showToast("Event created and ready for check-in", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to save event",
        "error",
      );
    }
  }

  return (
    <>
      <EventsChrome
        query={query}
        onQueryChange={setQuery}
        onCreate={openCreateDialog}
      >
        {eventsPromise ? (
          <Suspense fallback={<EventsGridSkeleton />}>
            <ResolvedEventsGrid
              eventsPromise={eventsPromise}
              query={query}
              onCreate={openCreateDialog}
            />
          </Suspense>
        ) : (
          <EventsGrid
            events={events ?? []}
            query={query}
            onCreate={openCreateDialog}
          />
        )}
      </EventsChrome>
      <EventDialogs
        activeEvent=""
        eventName={eventName}
        trackedFields={trackedFields}
        isEventOpen={isEventOpen}
        isDeleteEventOpen={false}
        onEventOpenChange={setIsEventOpen}
        onDeleteOpenChange={() => undefined}
        onEventNameChange={setEventName}
        onTrackedFieldsChange={setTrackedFields}
        onSave={createEvent}
        onDeleteRequest={() => undefined}
        onDelete={() => undefined}
      />
    </>
  );
}
