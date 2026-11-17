"use client";

import { Suspense, use, useEffect, useRef, useState } from "react";

import { saveEvent } from "@/app/actions";
import type { EventSummary } from "@/app/actions";
import { CreateEventWizardDialog } from "@/components/rollcall/events/create-event-wizard-dialog";
import {
  EventsChrome,
  EventsGrid,
} from "@/components/rollcall/events/events-list";
import { useToast } from "@/components/rollcall/layout/toast-provider";
import { prefersReducedMotion } from "@/components/rollcall/shared/use-motion";
import { EventsGridSkeleton } from "@/components/rollcall/shared/workspace-skeleton";

function ResolvedEventsGrid({
  eventsPromise,
  query,
  justAddedEventId,
  onClearJustAdded,
  onCreate,
}: {
  eventsPromise: Promise<EventSummary[]>;
  query: string;
  justAddedEventId?: string | null;
  onClearJustAdded?: () => void;
  onCreate: () => void;
}) {
  const events = use(eventsPromise);
  return (
    <EventsGrid
      events={events}
      query={query}
      justAddedEventId={justAddedEventId}
      onClearJustAdded={onClearJustAdded}
      onCreate={onCreate}
    />
  );
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
  const [justAddedEventId, setJustAddedEventId] = useState<string | null>(null);
  const justAddedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (justAddedTimerRef.current !== null) {
        window.clearTimeout(justAddedTimerRef.current);
      }
    };
  }, []);

  function markJustAdded(eventId: string) {
    if (justAddedTimerRef.current !== null) {
      window.clearTimeout(justAddedTimerRef.current);
    }
    setJustAddedEventId(eventId);
    const duration = prefersReducedMotion() ? 120 : 320;
    justAddedTimerRef.current = window.setTimeout(() => {
      setJustAddedEventId((current) => (current === eventId ? null : current));
    }, duration);
  }

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
              justAddedEventId={justAddedEventId}
              onClearJustAdded={() => setJustAddedEventId(null)}
              onCreate={() => setIsCreateOpen(true)}
            />
          </Suspense>
        ) : (
          <EventsGrid
            events={events ?? []}
            query={query}
            justAddedEventId={justAddedEventId}
            onClearJustAdded={() => setJustAddedEventId(null)}
            onCreate={() => setIsCreateOpen(true)}
          />
        )}
      </EventsChrome>
      <CreateEventWizardDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={async (input) => {
          const savedId = await saveEvent(input);
          markJustAdded(savedId);
          return savedId;
        }}
        onBackToEvents={() =>
          showToast("Event created and ready for check-in", "success")
        }
      />
    </>
  );
}
