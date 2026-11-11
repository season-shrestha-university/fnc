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
        className="mt-6 text-4xl font-bold tracking-[-.05em]"
      >
        {event.name}
      </h1>
      <p className="mt-3 text-[#68686f]">
        {event.participantCount} of {event.memberCount} participants
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          className="rounded-md bg-[#5b5ce2] px-4 py-2 text-sm font-semibold text-white"
          href={`/events/${event.id}/check-in`}
          prefetch={true}
        >
          Scan / check-in
        </Link>
        <Link
          className="rounded-md border border-[#e7e7ea] px-4 py-2 text-sm font-semibold"
          href={`/events/${event.id}/check-in`}
          prefetch={true}
        >
          View attendance
        </Link>
        <Link
          className="rounded-md border border-[#e7e7ea] px-4 py-2 text-sm font-semibold"
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
      <Link className="inline-block text-sm text-[#5b5ce2]" href="/events">
        Back to events
      </Link>
      <Suspense fallback={<EventDetailsSkeleton />}>
        <EventDetailsContent params={params} />
      </Suspense>
    </section>
  );
}
