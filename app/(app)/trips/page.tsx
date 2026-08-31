import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TripCard } from "@/components/trips/trip-card";
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
          className={cn(buttonVariants({ size: "sm" }), "bg-brand-gradient text-white")}
        >
          <Sparkles className="size-4" />
          New trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No trips yet. Generate your first Kuching itinerary.
          </p>
          <Link
            href="/plan"
            className={cn(
              buttonVariants(),
              "mt-4 bg-brand-gradient text-white",
            )}
          >
            <Sparkles className="size-4" />
            Plan a trip
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((t) => (
            <TripCard key={t.id} trip={t} />
          ))}
        </div>
      )}
    </div>
  );
}
