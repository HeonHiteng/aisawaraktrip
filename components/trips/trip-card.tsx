import Link from "next/link";
import { CalendarDays, Users, Wallet } from "lucide-react";
import {
  StatusBadge,
  TRIP_STATUS_TONE,
} from "@/components/common/status-badge";
import { formatDateRange, formatMYR } from "@/lib/format";
import { itineraryTotal, tripNights, type Trip } from "@/types/trip";

export function TripCard({ trip }: { trip: Trip }) {
  const nights = tripNights(trip);
  const est = itineraryTotal(trip.itinerary);
  const pax = trip.numAdults + trip.numChildren;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="block overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="bg-brand-hero px-4 py-3 text-white">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold leading-tight">{trip.title}</h3>
          <StatusBadge
            label={trip.status}
            tone={TRIP_STATUS_TONE[trip.status] ?? "muted"}
            className="bg-white/15 capitalize text-white"
          />
        </div>
        <p className="mt-0.5 text-xs text-white/70">
          {trip.destination} · {nights} day{nights === 1 ? "" : "s"}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 p-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {formatDateRange(trip.startDate, trip.endDate)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" />
          {pax} {pax === 1 ? "traveller" : "travellers"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wallet className="size-3.5" />
          {est ? `~${formatMYR(est)}` : "—"}
        </span>
      </div>
    </Link>
  );
}
