import { CalendarDays, Users } from "lucide-react";

import type { EventSummary } from "@/app/actions";
import LocalDate from "@/components/rollcall/shared/local-date";

const chartDateFormat: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

export function DashboardHeader() {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <h1
        id="dashboard-heading"
        className="font-sans text-4xl font-bold tracking-[-.05em]"
      >
        Dashboard
      </h1>

      <div className="w-fit rounded-full bg-[#e8f5ed] px-3 py-1.5 text-sm font-semibold text-[#26784f]">
        Live attendance
      </div>
    </header>
  );
}

export function DashboardMetrics({ events }: { events: EventSummary[] }) {
  const totalParticipants = events.reduce(
    (total, event) => total + event.participantCount,
    0,
  );
  const averageAttendance = events.length
    ? Math.round(
        events.reduce((total, event) => total + event.attendancePercentage, 0) /
          events.length,
      )
    : 0;
  const chartEvents = events.slice(0, 6).reverse();
  const chartMax = Math.max(
    1,
    ...chartEvents.map((event) =>
      Math.max(event.participantCount, event.memberCount),
    ),
  );

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <article
          data-testid="stat-total-events"
          className="rounded-2xl border border-[#e7e7ea] bg-white p-5 shadow-[0_12px_35px_rgba(27,27,42,.05)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#68686f]">
              Total events
            </span>
            <CalendarDays className="size-5 text-[#5b5ce2]" />
          </div>
          <strong className="mt-6 block text-4xl tracking-[-.06em]">
            {events.length}
          </strong>
          <span className="mt-1 block text-xs text-[#85858c]">
            Across your workspace
          </span>
        </article>
        <article
          data-testid="stat-total-participants"
          className="rounded-2xl border border-[#e7e7ea] bg-white p-5 shadow-[0_12px_35px_rgba(27,27,42,.05)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#68686f]">
              Participants
            </span>
            <Users className="size-5 text-[#5b5ce2]" />
          </div>
          <strong className="mt-6 block text-4xl tracking-[-.06em]">
            {totalParticipants}
          </strong>
          <span className="mt-1 block text-xs text-[#85858c]">
            Check-ins recorded
          </span>
        </article>
        <article
          data-testid="stat-avg-attendance"
          className="rounded-2xl border border-[#e7e7ea] bg-white p-5 shadow-[0_12px_35px_rgba(27,27,42,.05)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#68686f]">
              Avg. attendance
            </span>
            <span className="text-xl text-[#32a06c]">↗</span>
          </div>
          <strong className="mt-6 block text-4xl tracking-[-.06em]">
            {averageAttendance}%
          </strong>
          <span className="mt-1 block text-xs text-[#85858c]">
            Members who made it through
          </span>
        </article>
      </div>

      <div
        data-testid="events-participants-chart"
        className="mt-6 rounded-2xl border border-[#e7e7ea] bg-white p-5 shadow-[0_12px_35px_rgba(27,27,42,.05)] sm:p-7"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.11em] text-[#85858c]">
              Overview
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-.045em]">
              Participants per event
            </h2>
          </div>
          <p className="text-sm text-[#85858c]">Latest events first</p>
        </div>

        {chartEvents.length ? (
          <div className="mt-7 overflow-x-auto">
            <svg
              className="recharts-surface min-w-[560px]"
              role="img"
              aria-label="Participants per event bar chart"
              viewBox="0 0 760 280"
            >
              <line x1="52" x2="730" y1="225" y2="225" stroke="#e7e7ea" />
              {chartEvents.map((event, index) => {
                const x = 76 + index * 108;
                const height = Math.max(
                  6,
                  (event.participantCount / chartMax) * 170,
                );
                const y = 225 - height;
                return (
                  <g key={event.id}>
                    <rect
                      className="recharts-bar-rectangle"
                      x={x}
                      y={y}
                      width="46"
                      height={height}
                      rx="8"
                      fill="#5b5ce2"
                    />
                    <text
                      x={x + 23}
                      y="250"
                      textAnchor="middle"
                      fill="#85858c"
                      fontSize="12"
                    >
                      <LocalDate
                        value={event.eventDate}
                        options={chartDateFormat}
                      />
                    </text>
                    <text
                      x={x + 23}
                      y={y - 8}
                      textAnchor="middle"
                      fill="#17171a"
                      fontSize="12"
                      fontWeight="700"
                    >
                      {event.participantCount}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="mt-7 rounded-xl border border-dashed border-[#d8d8df] px-6 py-12 text-center">
            <p className="font-semibold">No attendance data yet</p>
            <p className="mt-2 text-sm text-[#68686f]">
              Create an event and check in members to see the trend.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default function DashboardView({ events }: { events: EventSummary[] }) {
  return (
    <section className="py-8 sm:py-12" aria-labelledby="dashboard-heading">
      <DashboardHeader />
      <DashboardMetrics events={events} />
    </section>
  );
}
