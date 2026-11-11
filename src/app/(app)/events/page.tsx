import { getEvents } from "@/app/actions";
import EventsView from "@/components/rollcall/events/events-view";

export default function EventsPage() {
  const eventsPromise = getEvents();
  return <EventsView eventsPromise={eventsPromise} />;
}
