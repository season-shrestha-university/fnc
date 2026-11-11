import { Suspense } from "react";

import { getDashboardData } from "@/app/actions";
import CheckInView from "@/components/check-in/check-in-view";
import { CheckInSkeleton } from "@/components/check-in/workspace-skeleton";

async function HomeCheckInContent() {
  const { event, checkIns } = await getDashboardData();
  return <CheckInView event={event} checkIns={checkIns} />;
}

export default function Home() {
  return (
    <Suspense fallback={<CheckInSkeleton />}>
      <HomeCheckInContent />
    </Suspense>
  );
}
