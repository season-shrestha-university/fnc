import { Suspense } from "react";

import { getEvents } from "@/app/actions";
import {
  DashboardHeader,
  DashboardMetrics,
} from "@/components/rollcall/dashboard/dashboard-view";
import { DashboardDataSkeleton } from "@/components/rollcall/shared/workspace-skeleton";

async function DashboardContent() {
  const events = await getEvents();
  return <DashboardMetrics events={events} />;
}

export default function DashboardPage() {
  return (
    <section className="py-8 sm:py-12" aria-labelledby="dashboard-heading">
      <DashboardHeader />
      <Suspense fallback={<DashboardDataSkeleton />}>
        <DashboardContent />
      </Suspense>
    </section>
  );
}
