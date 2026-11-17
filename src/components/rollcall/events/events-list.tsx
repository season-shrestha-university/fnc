"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, Plus, Search, Users } from "lucide-react";

import type { EventSummary } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LocalDate from "@/components/rollcall/shared/local-date";

const eventDateFormat: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
};

export function EventsChrome({
  query,
  onQueryChange,
  onCreate,
  children,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onCreate: () => void;
  children: ReactNode;
}) {
  return (
    <section className="py-8 sm:py-12" aria-labelledby="events-heading">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            id="events-heading"
            className="font-heading text-4xl font-extrabold tracking-[-.03em]"
          >
            Events
          </h1>
        </div>
        <Button size="lg" className="w-full sm:w-auto" onClick={onCreate}>
          <Plus />
          New event
        </Button>
      </div>

      <div className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search events"
          className="pl-10"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search events"
          type="search"
          value={query}
        />
      </div>

      {children}
    </section>
  );
}

export function EventsGrid({
  events,
  query,
  justAddedEventId,
  removingEventIds,
  onClearJustAdded,
  onCreate,
  onSelect,
}: {
  events: EventSummary[];
  query: string;
  justAddedEventId?: string | null;
  removingEventIds?: string[];
  onClearJustAdded?: () => void;
  onCreate: () => void;
  onSelect?: (eventId: string) => void;
}) {
  const removingSet = new Set(removingEventIds ?? []);
  const filteredEvents = events
    .toReversed()
    .filter((event) =>
      event.name.toLowerCase().includes(query.trim().toLowerCase()),
    );

  if (filteredEvents.length) {
    return (
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.map((event) => {
          const cardContent = (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-tint text-primary">
                  <CalendarDays className="size-5" />
                </div>
                <span className="rounded-full bg-tint px-2.5 py-1 text-[13px] font-bold text-accent-foreground">
                  {event.attendancePercentage}% attended
                </span>
              </div>
              <h2 className="mt-4 font-heading text-xl font-extrabold tracking-[-.02em]">
                {event.name}
              </h2>
              <p
                data-testid="event-date"
                className="mt-1 text-[15px] font-medium text-muted-foreground"
              >
                <LocalDate value={event.eventDate} options={eventDateFormat} />
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-tint">
                <span
                  className="block h-full origin-left rounded-full bg-primary"
                  style={{
                    transform: `scaleX(${Math.min(1, Math.max(0, event.attendancePercentage / 100))})`,
                  }}
                />
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
                <div className="flex items-center gap-2 text-[15px] font-medium text-muted-foreground">
                  <Users className="size-[18px]" />
                  <span data-testid="event-participants">
                    {event.participantCount} / {event.memberCount} participants
                  </span>
                </div>
                <strong
                  data-testid="event-percentage"
                  className="font-heading text-2xl font-extrabold tracking-[-.02em] tabular-nums"
                >
                  {event.attendancePercentage}%
                </strong>
              </div>
            </>
          );

          if (onSelect) {
            return (
              <article
                key={event.id}
                data-testid={`event-item-${event.id}`}
                data-just-added={
                  event.id === justAddedEventId ? "true" : undefined
                }
                data-removing={removingSet.has(event.id) ? "true" : undefined}
                onAnimationEnd={(animEvent) => {
                  if (
                    animEvent.target === animEvent.currentTarget &&
                    event.id === justAddedEventId
                  ) {
                    onClearJustAdded?.();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Select ${event.name}`}
                onClick={() => onSelect(event.id)}
                onKeyDown={(keyboardEvent) => {
                  if (
                    keyboardEvent.key === "Enter" ||
                    keyboardEvent.key === " "
                  ) {
                    keyboardEvent.preventDefault();
                    onSelect(event.id);
                  }
                }}
                className="list-item-enter list-item-exit group cursor-pointer rounded-xl bg-card p-5 ring-1 ring-border transition-shadow hover:shadow-[0_10px_30px_rgba(27,37,40,.08)] hover:ring-tint-strong"
              >
                {cardContent}
              </article>
            );
          }

          return (
            <Link
              key={event.id}
              href={`/events/${event.id}/check-in`}
              prefetch={true}
              data-testid={`event-item-${event.id}`}
              data-just-added={
                event.id === justAddedEventId ? "true" : undefined
              }
              data-removing={removingSet.has(event.id) ? "true" : undefined}
              onAnimationEnd={(animEvent) => {
                if (
                  animEvent.target === animEvent.currentTarget &&
                  event.id === justAddedEventId
                ) {
                  onClearJustAdded?.();
                }
              }}
              aria-label={`Select ${event.name}`}
              className="list-item-enter list-item-exit group block cursor-pointer rounded-xl bg-card p-5 ring-1 ring-border transition-shadow hover:shadow-[0_10px_30px_rgba(27,37,40,.08)] hover:ring-tint-strong"
            >
              {cardContent}
            </Link>
          );
        })}
      </div>
    );
  }

  if (events.length) {
    return (
      <div className="mt-8 rounded-xl bg-card px-6 py-16 text-center ring-1 ring-border">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-tint text-primary">
          <Search className="size-6" />
        </span>
        <h2 className="mt-4 font-heading text-lg font-extrabold">No matching events</h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Try a different event name.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl bg-card px-6 py-16 text-center ring-1 ring-border">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-tint text-primary">
        <CalendarDays className="size-6" />
      </span>
      <h2 className="mt-4 font-heading text-lg font-extrabold">No events yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-[15px] leading-6 text-muted-foreground">
        Create your first event to start tracking attendance at the door.
      </p>
      <Button size="lg" className="mt-5" onClick={onCreate}>
        Create an event
      </Button>
    </div>
  );
}

export default function EventsList({
  events,
  onCreate,
  onSelect,
}: {
  events: EventSummary[];
  onCreate: () => void;
  onSelect?: (eventId: string) => void;
}) {
  const [query, setQuery] = useState("");

  return (
    <EventsChrome query={query} onQueryChange={setQuery} onCreate={onCreate}>
      <EventsGrid
        events={events}
        query={query}
        onCreate={onCreate}
        onSelect={onSelect}
      />
    </EventsChrome>
  );
}
