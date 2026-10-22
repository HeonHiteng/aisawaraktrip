import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Sparkles, Users, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/lib/utils";
import { formatDateRange, formatMYR } from "@/lib/format";
import { DEFAULT_PHOTO } from "@/lib/photo-credits";
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
  "group block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** `coverUrl`: a photo of the trip's first place (lib/card-photos `tripCover`). */
export function TripCard({
  trip,
  coverUrl,
  featured = false,
}: {
  trip: Trip;
  coverUrl?: string;
  featured?: boolean;
}) {
  const nights = tripNights(trip);
  const est = itineraryTotal(trip.itinerary);
  const pax = trip.numAdults + trip.numChildren;
  const status = TRIP_STATUS_META[trip.status] ?? TRIP_STATUS_META.planned;
  const expCount = experienceCount(trip);
  const cover = coverUrl ?? DEFAULT_PHOTO;

  const meta = (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="size-3.5 shrink-0" aria-hidden />
        {formatDateRange(trip.startDate, trip.endDate)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Users className="size-3.5 shrink-0" aria-hidden />
        {pax} {pax === 1 ? "traveller" : "travellers"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Wallet className="size-3.5 shrink-0" aria-hidden />
        {est ? `~${formatMYR(est)}` : "—"}
      </span>
    </div>
  );

  if (featured) {
    return (
      <Link href={`/trips/${trip.id}`} className={CARD}>
        <div className="relative h-40 w-full bg-muted">
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 672px) 100vw, 640px"
            priority
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <StatusBadge
            label={status.label}
            tone={status.tone}
            className="absolute top-3 right-3 bg-black/45 text-white backdrop-blur-sm"
          />
          <div className="absolute inset-x-4 bottom-3 text-white">
            <h3 className="text-lg font-bold leading-tight tracking-tight">
              {trip.title}
            </h3>
            <p className="mt-0.5 text-xs text-white/80">
              {trip.destination} · {nights} day{nights === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="space-y-2 p-4">
          {meta}
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" aria-hidden />
            {trip.itinerary
              ? `Day-by-day plan${expCount ? ` · ${expCount} experience${expCount === 1 ? "" : "s"}` : ""}`
              : "No itinerary yet"}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/trips/${trip.id}`} className={cn(CARD, "flex")}>
      <div className="relative w-24 shrink-0 bg-muted">
        <Image
          src={cover}
          alt=""
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold leading-tight">{trip.title}</h3>
          <StatusBadge label={status.label} tone={status.tone} />
        </div>
        <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
          {trip.destination} · {nights} day{nights === 1 ? "" : "s"}
          {trip.itinerary && expCount
            ? ` · ${expCount} experience${expCount === 1 ? "" : "s"}`
            : ""}
        </p>
        {meta}
      </div>
    </Link>
  );
}
