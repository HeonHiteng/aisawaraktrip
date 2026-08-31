import { ItemRow } from "@/components/itinerary/item-row";
import { formatDate, formatMYR } from "@/lib/format";
import type { BookingStatus } from "@/types/booking";
import { dayTotal, type ItineraryDay } from "@/types/trip";

export function DayCard({
  day,
  tripId,
  bookingsByExperience,
}: {
  day: ItineraryDay;
  tripId: string;
  bookingsByExperience: Record<string, { id: string; status: BookingStatus }>;
}) {
  const total = dayTotal(day);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <div>
          <p className="font-semibold">
            Day {day.dayNumber}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {formatDate(day.date, { weekday: "short" })}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">{day.summary}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {total > 0 ? `~${formatMYR(total)}` : "Free"}
        </span>
      </header>

      <div className="divide-y divide-border px-4">
        {day.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing planned — add something from Explore.
          </p>
        ) : (
          day.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              tripId={tripId}
              booking={
                item.experienceId
                  ? bookingsByExperience[item.experienceId]
                  : undefined
              }
            />
          ))
        )}
      </div>
    </section>
  );
}
