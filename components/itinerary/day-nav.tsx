import { formatDate } from "@/lib/format";
import type { ItineraryDay } from "@/types/trip";

/**
 * Quick day-jump pills above the itinerary — useful once a trip runs more than a
 * couple of days. Plain anchor links to each `DayCard`'s id; no client JS needed.
 */
export function DayNav({ days }: { days: ItineraryDay[] }) {
  if (days.length <= 1) return null;
  return (
    <nav
      aria-label="Jump to day"
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5"
    >
      {days.map((d) => (
        <a
          key={d.dayNumber}
          href={`#day-${d.dayNumber}`}
          className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card transition-colors hover:border-primary/40 hover:text-primary"
        >
          Day {d.dayNumber}
          <span className="ml-1 text-[10px] text-muted-foreground/70">
            {formatDate(d.date, { weekday: "short" })}
          </span>
        </a>
      ))}
    </nav>
  );
}
