import Link from "next/link";
import { CalendarDays, Users, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateRange, formatMYR } from "@/lib/format";
import {
  itineraryTotal,
  tripNights,
  TRIP_STATUS_META,
  type Trip,
} from "@/types/trip";

export function TripCard({ trip }: { trip: Trip }) {
  const nights = tripNights(trip);
  const est = itineraryTotal(trip.itinerary);
  const pax = trip.numAdults + trip.numChildren;
  const status = TRIP_STATUS_META[trip.status] ?? TRIP_STATUS_META.planned;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
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
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 p-4 text-xs text-muted-foreground">
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
    </Link>
  );
}
