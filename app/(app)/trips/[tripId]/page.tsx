import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, RefreshCw, Trash2, Users } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmSubmit } from "@/components/common/confirm-submit";
import { EmptyState } from "@/components/common/empty-state";
import { BudgetBar } from "@/components/itinerary/budget-bar";
import { DayCard } from "@/components/itinerary/day-card";
import { RefineBox } from "@/components/itinerary/refine-box";
import { TripReadiness } from "@/components/itinerary/trip-readiness";
import { requireUser } from "@/lib/auth";
import { bookingsForTrip } from "@/lib/domain/bookings";
import { getTrip } from "@/lib/domain/trips";
import { formatDateRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types/booking";
import { itineraryTotal, tripNights, TRIP_STATUS_META } from "@/types/trip";
import {
  deleteTripAction,
  regenerateTrip,
} from "@/app/(app)/trips/actions";

export async function generateMetadata({
  params,
}: PageProps<"/trips/[tripId]">): Promise<Metadata> {
  const { tripId } = await params;
  const user = await requireUser();
  const trip = await getTrip(user.id, tripId);
  return { title: trip?.title ?? "Trip" };
}

export default async function TripDetailPage({
  params,
}: PageProps<"/trips/[tripId]">) {
  const { tripId } = await params;
  const user = await requireUser();
  const trip = await getTrip(user.id, tripId);
  if (!trip) notFound();

  const nights = tripNights(trip);
  const pax = trip.numAdults + trip.numChildren;
  const estimated = itineraryTotal(trip.itinerary);

  const bookings = await bookingsForTrip(user.id, trip.id);
  const bookingsByExperience: Record<
    string,
    { id: string; status: BookingStatus }
  > = {};
  for (const b of bookings) {
    bookingsByExperience[b.experienceId] = { id: b.id, status: b.status };
  }
  const bookableExpIds = new Set(
    trip.itinerary?.days.flatMap((d) =>
      d.items.filter((i) => i.bookable && i.experienceId).map((i) => i.experienceId!),
    ) ?? [],
  );
  const bookedCount = [...bookableExpIds].filter(
    (id) => bookingsByExperience[id],
  ).length;

  return (
    <div className="space-y-5">
      <Link
        href="/trips"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        My Trips
      </Link>

      <div className="overflow-hidden rounded-2xl bg-brand-hero p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold leading-tight">{trip.title}</h1>
          <StatusBadge
            label={(TRIP_STATUS_META[trip.status] ?? TRIP_STATUS_META.planned).label}
            tone={(TRIP_STATUS_META[trip.status] ?? TRIP_STATUS_META.planned).tone}
            className="bg-white/15 text-white"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/75">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {formatDateRange(trip.startDate, trip.endDate)} · {nights} day
            {nights === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" />
            {pax} {pax === 1 ? "traveller" : "travellers"} · {trip.groupType}
          </span>
        </div>
        {trip.itinerary && (
          <p className="mt-2 text-xs text-white/70">
            {trip.itinerary.generatedBy === "ai"
              ? "AI-generated"
              : "Edited by you"}
            {trip.itinerary.version > 1 ? " · revised" : ""}
          </p>
        )}
      </div>

      <BudgetBar
        estimated={estimated}
        budget={trip.budgetPerPerson}
        pax={pax}
      />

      {trip.itinerary ? (
        <>
          {bookableExpIds.size > 0 && (
            <TripReadiness booked={bookedCount} total={bookableExpIds.size} />
          )}

          <RefineBox tripId={trip.id} />

          <div className="space-y-4">
            {trip.itinerary.days.map((day) => (
              <DayCard
                key={day.dayNumber}
                day={day}
                tripId={trip.id}
                bookingsByExperience={bookingsByExperience}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <form action={regenerateTrip}>
              <input type="hidden" name="tripId" value={trip.id} />
              <Button type="submit" variant="outline" size="sm">
                <RefreshCw className="size-4" />
                Regenerate whole trip
              </Button>
            </form>
            <Link
              href="/explore"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Add from Explore
            </Link>
            <div className="ml-auto">
              <ConfirmSubmit
                action={deleteTripAction}
                hidden={{ tripId: trip.id }}
                triggerLabel="Delete"
                triggerIcon={<Trash2 className="size-4" />}
                promptLabel="Delete this trip and its itinerary?"
                confirmLabel="Delete trip"
                pendingLabel="Deleting…"
              />
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No itinerary yet"
          description="Regenerate this trip to build a day-by-day plan."
        />
      )}
    </div>
  );
}
