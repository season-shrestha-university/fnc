import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getDashboardData } from "@/app/actions";
import CheckInView from "@/components/rollcall/check-in/check-in-view";
import { CheckInSkeleton } from "@/components/rollcall/shared/workspace-skeleton";

async function EventCheckInContent({
  params,
}: Pick<PageProps<"/events/[id]/check-in">, "params">) {
  const { id } = await params;
  const { event, memberCount, checkIns } = await getDashboardData(id);
  if (!event) redirect("/events");

  return (
    <CheckInView event={event} memberCount={memberCount} checkIns={checkIns} />
  );
}

export default function EventCheckInPage({
  params,
}: PageProps<"/events/[id]/check-in">) {
  return (
    <Suspense fallback={<CheckInSkeleton />}>
      <EventCheckInContent params={params} />
    </Suspense>
  );
}
