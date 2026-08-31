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
    <section className="rounded-2xl border border-border bg-card shadow-card">
      <header className="flex items-center gap-3 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {day.dayNumber}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {formatDate(day.date, { weekday: "long", day: "numeric", month: "short" })}
          </p>
          <p className="truncate text-xs text-muted-foreground">{day.summary}</p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {total > 0 ? `~${formatMYR(total)}` : "Free"}
        </span>
      </header>

      <div className="px-4 pb-2">
        {day.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            Nothing planned — add something from Explore.
          </p>
        ) : (
          <ol className="relative">
            {/* the timeline spine — runs through the item dots */}
            <span
              className="absolute left-[4.75rem] top-4 bottom-8 w-px -translate-x-1/2 bg-border"
              aria-hidden
            />
            {day.items.map((item) => (
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
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
