import type { Metadata } from "next";
import { TripForm } from "@/components/plan/trip-form";

export const metadata: Metadata = { title: "Plan a trip" };

function isoIn(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function PlanPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Trip Planner</h1>
        <p className="text-sm text-muted-foreground">
          A personalized Kuching itinerary in about a minute.
        </p>
      </div>
      <TripForm defaultStart={isoIn(21)} defaultEnd={isoIn(23)} />
    </div>
  );
}
