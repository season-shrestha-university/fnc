"use client";

import { Suspense, use, useState } from "react";

import { saveEvent } from "@/app/actions";
import type { EventSummary } from "@/app/actions";
import { CreateEventWizardDialog } from "@/components/rollcall/events/create-event-wizard-dialog";
import {
  EventsChrome,
  EventsGrid,
} from "@/components/rollcall/events/events-list";
import { useToast } from "@/components/rollcall/layout/toast-provider";
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <EventsChrome
        query={query}
        onQueryChange={setQuery}
        onCreate={() => setIsCreateOpen(true)}
      >
        {eventsPromise ? (
          <Suspense fallback={<EventsGridSkeleton />}>
            <ResolvedEventsGrid
              eventsPromise={eventsPromise}
              query={query}
              onCreate={() => setIsCreateOpen(true)}
            />
          </Suspense>
        ) : (
          <EventsGrid
            events={events ?? []}
            query={query}
            onCreate={() => setIsCreateOpen(true)}
          />
        )}
      </EventsChrome>
      <CreateEventWizardDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={(input) => saveEvent(input)}
        onBackToEvents={() =>
          showToast("Event created and ready for check-in", "success")
        }
      />
    </>
  );
}
