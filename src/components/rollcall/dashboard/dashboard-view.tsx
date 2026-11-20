import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  ScanLine,
  TrendingUp,
  Users,
} from "lucide-react";

import type { EventSummary } from "@/app/actions";
import LocalDate from "@/components/rollcall/shared/local-date";

const chartDateFormat: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

const eventDateFormat: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
};

const tileClass =
  "flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-border sm:p-4 lg:flex-row lg:items-center lg:gap-4";
const chipClass =
  "flex size-9 shrink-0 items-center justify-center rounded-full bg-tint text-primary sm:size-10";

export function DashboardHeader() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1
          id="dashboard-heading"
          className="font-heading text-4xl font-extrabold tracking-[-.03em]"
        >
          Dashboard
        </h1>
      </div>

      <div className="inline-flex w-fit items-center gap-2 rounded-full bg-tint px-3 py-1.5 text-[13px] font-bold text-accent-foreground">
        <span className="size-[7px] animate-live-blink rounded-full bg-primary" />
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
  const latestEvent = events[0];

  return (
    <>
      <div
        className={`mt-8 grid gap-4 ${latestEvent ? "lg:grid-cols-[1.15fr_1fr]" : ""}`}
      >
        {latestEvent && (
          <article className="rounded-xl bg-card p-4 ring-1 ring-border sm:p-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-tint px-2.5 py-1 text-[13px] font-bold text-accent-foreground">
              <span className="size-[7px] rounded-full bg-primary" />
              Latest event
            </span>
            <h2 className="mt-3 font-heading text-[25px] font-extrabold leading-tight tracking-[-.02em]">
              {latestEvent.name}
            </h2>
            <ul className="mt-3 grid gap-1">
              <li className="flex items-center gap-3 py-1.5 text-base font-semibold">
                <span className={chipClass}>
                  <CalendarDays className="size-[18px]" />
                </span>
                <LocalDate
                  value={latestEvent.eventDate}
                  options={eventDateFormat}
                />
              </li>
              <li className="flex items-center gap-3 py-1.5 text-base font-semibold">
                <span className={chipClass}>
                  <Users className="size-[18px]" />
                </span>
                {latestEvent.memberCount} members expected
              </li>
            </ul>
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex justify-between text-[15px] font-semibold text-muted-foreground">
                <span>Checked in</span>
                <strong className="text-foreground tabular-nums">
                  {latestEvent.participantCount} of {latestEvent.memberCount}
                </strong>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tint">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${latestEvent.attendancePercentage}%` }}
                />
              </div>
            </div>
            <Link
              href={`/events/${latestEvent.id}/check-in`}
              prefetch={true}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[17px] font-bold text-primary-foreground transition-colors hover:bg-primary-strong"
            >
              <ScanLine className="size-5" />
              Open check-in
            </Link>
          </article>
        )}

        <div className="grid content-start gap-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1">
            <article data-testid="stat-total-events" className={tileClass}>
              <span className={chipClass}>
                <CalendarDays className="size-[18px]" />
              </span>
              <div className="min-w-0 lg:flex-1">
                <strong className="block font-heading text-[22px] font-extrabold leading-tight tracking-[-.02em] tabular-nums sm:text-3xl">
                  {events.length}
                </strong>
                <span className="block text-[13px] font-semibold text-muted-foreground sm:text-sm">
                  Total events
                </span>
                <span className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
                  Across your workspace
                </span>
              </div>
            </article>
            <article
              data-testid="stat-total-participants"
              className={tileClass}
            >
              <span className={chipClass}>
                <Users className="size-[18px]" />
              </span>
              <div className="min-w-0 lg:flex-1">
                <strong className="block font-heading text-[22px] font-extrabold leading-tight tracking-[-.02em] tabular-nums sm:text-3xl">
                  {totalParticipants}
                </strong>
                <span className="block text-[13px] font-semibold text-muted-foreground sm:text-sm">
                  Participants
                </span>
                <span className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
                  Check-ins recorded
                </span>
              </div>
            </article>
            <article data-testid="stat-avg-attendance" className={tileClass}>
              <span className={chipClass}>
                <TrendingUp className="size-[18px]" />
              </span>
              <div className="min-w-0 lg:flex-1">
                <strong className="block font-heading text-[22px] font-extrabold leading-tight tracking-[-.02em] tabular-nums sm:text-3xl">
                  {averageAttendance}%
                </strong>
                <span className="block text-[13px] font-semibold text-muted-foreground sm:text-sm">
                  Avg. attendance
                </span>
                <span className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
                  Members who made it through
                </span>
              </div>
            </article>
          </div>

          <div className="rounded-xl bg-card px-4 py-1 ring-1 ring-border">
            <Link
              href="/events"
              className="flex min-h-[60px] items-center gap-3 text-[17px] font-bold"
            >
              <span className={chipClass}>
                <CalendarDays className="size-[18px]" />
              </span>
              <span className="flex-1">All events</span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
            <Link
              href="/members"
              className="flex min-h-[60px] items-center gap-3 border-t border-border text-[17px] font-bold"
            >
              <span className={chipClass}>
                <Users className="size-[18px]" />
              </span>
              <span className="flex-1">Member directory</span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>

      <div
        data-testid="events-participants-chart"
        className="mt-4 rounded-xl bg-card p-5 ring-1 ring-border sm:p-7"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[15px] font-bold text-muted-foreground">
              Overview
            </p>
            <h2 className="mt-1 font-heading text-2xl font-extrabold tracking-[-.02em]">
              Participants per event
            </h2>
          </div>
          <p className="text-[15px] font-medium text-muted-foreground">
            Latest events first
          </p>
        </div>

        {chartEvents.length ? (
          <div className="mt-7 overflow-x-auto">
            <svg
              className="recharts-surface min-w-[560px]"
              role="img"
              aria-label="Participants per event bar chart"
              viewBox="0 0 760 280"
            >
              <line x1="52" x2="730" y1="225" y2="225" stroke="var(--border)" />
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
                      fill="var(--primary)"
                    />
                    <text
                      x={x + 23}
                      y="250"
                      textAnchor="middle"
                      fill="var(--muted-foreground)"
                      fontSize="13"
                      fontWeight="600"
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
                      fill="var(--foreground)"
                      fontSize="13"
                      fontWeight="800"
                    >
                      {event.participantCount}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="mt-7 rounded-xl border border-dashed border-input px-6 py-12 text-center">
            <p className="font-bold">No attendance data yet</p>
            <p className="mt-2 text-[15px] text-muted-foreground">
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
