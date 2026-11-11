import { getEvents } from "@/app/actions";
import EventsView from "@/components/check-in/events-view";

export default function EventsPage() {
  const eventsPromise = getEvents();
  return <EventsView eventsPromise={eventsPromise} />;
}
