const block = "rounded bg-[#e7e7ea]";
const card = "rounded-2xl border border-[#e7e7ea] bg-white";

export function DashboardDataSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading dashboard metrics"
      className="animate-pulse"
    >
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={`h-36 ${card}`} />
        ))}
      </div>
      <div className={`mt-6 h-[380px] ${card}`} />
    </div>
  );
}

export function EventsGridSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading events"
      className="mt-8 grid animate-pulse gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className={`h-56 ${card}`} />
      ))}
    </div>
  );
}

export function MembersListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading members"
      className="grid animate-pulse gap-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className={`h-[74px] ${card}`} />
      ))}
    </div>
  );
}

export function EventDetailsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading event details"
      className="animate-pulse"
    >
      <div className={`mt-6 h-11 w-72 ${block}`} />
      <div className={`mt-3 h-5 w-44 ${block}`} />
      <div className="mt-8 flex flex-wrap gap-3">
        <div className={`h-9 w-32 rounded-md ${block}`} />
        <div className={`h-9 w-36 rounded-md ${block}`} />
        <div className={`h-9 w-28 rounded-md ${block}`} />
      </div>
    </div>
  );
}

export function CheckInSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading event check-in"
      className="animate-pulse"
    >
      <div className="mt-10 mb-6 h-[74px] rounded-[13px] border border-[#e7e7ea] bg-white" />
      <div className="grid gap-6 lg:grid-cols-[1.28fr_1fr]">
        <div className="h-[410px] rounded-[15px] border border-[#e7e7ea] bg-white" />
        <div className="h-[410px] rounded-[15px] border border-[#e7e7ea] bg-white" />
      </div>
      <div className="mt-10">
        <div className={`h-4 w-32 ${block}`} />
        <div className={`mt-2 mb-4 h-8 w-48 ${block}`} />
        <div className="overflow-hidden rounded-[13px] border border-[#e7e7ea] bg-white">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-[68px] border-b border-[#f0f0f2] px-5 py-3.5 last:border-b-0"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceSkeleton({
  variant,
}: {
  variant: "dashboard" | "events" | "list" | "event";
}) {
  if (variant === "dashboard") return <DashboardDataSkeleton />;
  if (variant === "events") return <EventsGridSkeleton />;
  if (variant === "list") return <MembersListSkeleton />;
  return <CheckInSkeleton />;
}
