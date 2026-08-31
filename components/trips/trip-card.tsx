import Link from "next/link";
import { CalendarDays, Sparkles, Users, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/lib/utils";
import { formatDateRange, formatMYR } from "@/lib/format";
import {
  itineraryTotal,
  tripNights,
  TRIP_STATUS_META,
  type Trip,
} from "@/types/trip";

function experienceCount(trip: Trip): number {
  if (!trip.itinerary) return 0;
  return trip.itinerary.days.reduce(
    (n, d) => n + d.items.filter((i) => i.experienceId).length,
    0,
  );
}

const CARD =
  "block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const DOT_TONE: Record<string, string> = {
  muted: "bg-muted-foreground/40",
  violet: "bg-primary",
  green: "bg-emerald-500",
  blue: "bg-sky-500",
};

export function TripCard({
  trip,
  featured = false,
}: {
  trip: Trip;
  featured?: boolean;
}) {
  const nights = tripNights(trip);
  const est = itineraryTotal(trip.itinerary);
  const pax = trip.numAdults + trip.numChildren;
  const status = TRIP_STATUS_META[trip.status] ?? TRIP_STATUS_META.planned;
  const expCount = experienceCount(trip);

  const meta = (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="size-3.5 shrink-0" />
        {formatDateRange(trip.startDate, trip.endDate)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Users className="size-3.5 shrink-0" />
        {pax} {pax === 1 ? "traveller" : "travellers"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Wallet className="size-3.5 shrink-0" />
        {est ? `~${formatMYR(est)}` : "—"}
      </span>
    </div>
  );

  if (featured) {
    return (
      <Link href={`/trips/${trip.id}`} className={CARD}>
        <div className="bg-brand-hero px-4 py-3 text-white">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold leading-tight">{trip.title}</h3>
            <StatusBadge
              label={status.label}
              tone={status.tone}
              className="bg-white/15 text-white"
            />
          </div>
          <p className="mt-0.5 text-xs text-white/70">
            {trip.destination} · {nights} day{nights === 1 ? "" : "s"}
          </p>
        </div>
        <div className="space-y-2 p-4">
          {meta}
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            {trip.itinerary
              ? `Day-by-day plan${expCount ? ` · ${expCount} experience${expCount === 1 ? "" : "s"}` : ""}`
              : "No itinerary yet"}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/trips/${trip.id}`} className={cn(CARD, "p-4")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full",
              DOT_TONE[status.tone] ?? DOT_TONE.violet,
            )}
          />
          <h3 className="truncate font-semibold leading-tight">{trip.title}</h3>
        </div>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>
      <div className="mt-2.5 space-y-2">
        {meta}
        <p className="text-xs text-muted-foreground">
          {trip.destination} · {nights} day{nights === 1 ? "" : "s"}
          {trip.itinerary && expCount
            ? ` · ${expCount} experience${expCount === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>
    </Link>
  );
}
