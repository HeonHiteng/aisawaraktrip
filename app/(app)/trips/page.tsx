import type { Metadata } from "next";
import Link from "next/link";
import { MapPinned, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TripCard } from "@/components/trips/trip-card";
import { EmptyState } from "@/components/common/empty-state";
import { requireUser } from "@/lib/auth";
import { listTrips } from "@/lib/domain/trips";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My Trips" };

export default async function TripsPage() {
  const user = await requireUser();
  const trips = await listTrips(user.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">My Trips</h1>
        <Link
          href="/plan"
          className={cn(buttonVariants({ variant: "brand", size: "sm" }))}
        >
          <Sparkles className="size-4" />
          New trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No trips yet"
          description="Tell the planner your dates, budget and interests — it builds a day-by-day Kuching itinerary from verified places."
          action={{ label: "Plan a trip", href: "/plan" }}
        />
      ) : (
        <div className="space-y-4">
          {trips.map((t, i) => (
            <TripCard key={t.id} trip={t} featured={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
