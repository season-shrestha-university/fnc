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
      <div className="flex flex-col gap-6 border-b border-[#e7e7ea] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[.11em] text-[#85858c]">
            Workspace calendar
          </p>
          <h1
            id="events-heading"
            className="font-sans text-4xl font-bold tracking-[-.05em]"
          >
            Events
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#68686f]">
            Keep an eye on every gathering and how many members have made it
            through the door.
          </p>
        </div>
        <Button
          className="h-11 gap-2 bg-[#5b5ce2] px-5 text-white hover:bg-[#4748c5]"
          onClick={onCreate}
        >
          <Plus className="size-4" />
          New event
        </Button>
      </div>

      <div className="relative mt-7 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#85858c]" />
        <Input
          aria-label="Search events"
          className="h-10 border-[#e7e7ea] bg-white pl-9"
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
  onCreate,
  onSelect,
}: {
  events: EventSummary[];
  query: string;
  onCreate: () => void;
  onSelect?: (eventId: string) => void;
}) {
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
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#f1f1f6] text-[#5b5ce2]">
                  <CalendarDays className="size-5" />
                </div>
                <span className="rounded-full bg-[#e8f5ed] px-2.5 py-1 text-xs font-bold text-[#26784f]">
                  {event.attendancePercentage}% attended
                </span>
              </div>
              <h2 className="mt-5 text-xl font-bold tracking-[-.03em]">
                {event.name}
              </h2>
              <p
                data-testid="event-date"
                className="mt-2 text-sm text-[#68686f]"
              >
                <LocalDate value={event.eventDate} options={eventDateFormat} />
              </p>
              <div className="mt-6 flex items-end justify-between border-t border-[#eeeef1] pt-4">
                <div className="flex items-center gap-2 text-sm text-[#68686f]">
                  <Users className="size-4 text-[#85858c]" />
                  <span data-testid="event-participants">
                    {event.participantCount} / {event.memberCount} participants
                  </span>
                </div>
                <strong
                  data-testid="event-percentage"
                  className="text-2xl tracking-[-.05em]"
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
                className="group cursor-pointer rounded-2xl border border-[#e7e7ea] bg-white p-5 shadow-[0_12px_35px_rgba(27,27,42,.05)] transition-shadow hover:shadow-[0_16px_40px_rgba(27,27,42,.1)]"
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
              aria-label={`Select ${event.name}`}
              className="group block cursor-pointer rounded-2xl border border-[#e7e7ea] bg-white p-5 shadow-[0_12px_35px_rgba(27,27,42,.05)] transition-shadow hover:shadow-[0_16px_40px_rgba(27,27,42,.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b5ce2]"
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
      <div className="mt-8 rounded-2xl border border-dashed border-[#d8d8df] bg-white px-6 py-16 text-center">
        <Search className="mx-auto size-8 text-[#85858c]" />
        <h2 className="mt-4 text-lg font-bold">No matching events</h2>
        <p className="mt-2 text-sm text-[#68686f]">
          Try a different event name.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-[#d8d8df] bg-white px-6 py-16 text-center">
      <CalendarDays className="mx-auto size-8 text-[#85858c]" />
      <h2 className="mt-4 text-lg font-bold">No events yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#68686f]">
        Create your first event to start tracking attendance at the door.
      </p>
      <Button className="mt-5" onClick={onCreate}>
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
