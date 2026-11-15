import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getEvents } from "@/app/actions";
import { EventDetailsSkeleton } from "@/components/rollcall/shared/workspace-skeleton";

async function EventDetailsContent({
  params,
}: Pick<PageProps<"/events/[id]">, "params">) {
  const { id } = await params;
  const events = await getEvents();
  const event = events.find((candidate) => candidate.id === id);
  if (!event) notFound();

  return (
    <>
      <h1
        id="event-heading"
        className="mt-6 font-heading text-4xl font-extrabold tracking-[-.03em]"
      >
        {event.name}
      </h1>
      <p className="mt-2 text-base font-medium text-muted-foreground tabular-nums">
        {event.participantCount} of {event.memberCount} participants
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          className="inline-flex h-14 items-center rounded-lg bg-primary px-5 text-[17px] font-bold text-primary-foreground transition-colors hover:bg-primary-strong"
          href={`/events/${event.id}/check-in`}
          prefetch={true}
        >
          Scan / check-in
        </Link>
        <Link
          className="inline-flex h-14 items-center rounded-lg bg-card px-5 text-[17px] font-bold ring-1 ring-border transition-colors hover:bg-muted"
          href={`/events/${event.id}/check-in`}
          prefetch={true}
        >
          View attendance
        </Link>
        <Link
          className="inline-flex h-14 items-center rounded-lg bg-card px-5 text-[17px] font-bold ring-1 ring-border transition-colors hover:bg-muted"
          href={`/events/${event.id}/check-in`}
          prefetch={true}
        >
          Update event
        </Link>
      </div>
    </>
  );
}

export default function EventDetailsPage({
  params,
}: PageProps<"/events/[id]">) {
  return (
    <section className="py-8 sm:py-12" aria-labelledby="event-heading">
      <Link
        className="inline-flex min-h-11 items-center text-[15px] font-bold text-primary hover:text-primary-strong"
        href="/events"
      >
        Back to events
      </Link>
      <Suspense fallback={<EventDetailsSkeleton />}>
        <EventDetailsContent params={params} />
      </Suspense>
    </section>
  );
}
