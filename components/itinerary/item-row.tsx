import Link from "next/link";
import {
  Car,
  Check,
  Coffee,
  Compass,
  Landmark,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";
import { formatMYR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types/booking";
import type { ItineraryItem } from "@/types/trip";
import { removeTripItem } from "@/app/(app)/trips/actions";

const ICON = {
  experience: Compass,
  attraction: Landmark,
  meal: Coffee,
  transport: Car,
  free_time: Sparkles,
} as const;

export function ItemRow({
  item,
  tripId,
  booking,
}: {
  item: ItineraryItem;
  tripId: string;
  booking?: { id: string; status: BookingStatus };
}) {
  const Icon = ICON[item.type];
  const isExp = item.type === "experience";

  return (
    <li className="group/item relative flex gap-3 py-3">
      {/* time gutter */}
      <div className="w-12 shrink-0 pt-1 text-right text-[11px] leading-tight text-muted-foreground">
        <div className="font-semibold text-foreground">{item.startTime}</div>
        <div>{item.endTime}</div>
      </div>

      {/* dot on the spine */}
      <div
        className={cn(
          "z-10 mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-card",
          isExp
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </div>

      {/* content */}
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-snug">{item.title}</p>
          <form action={removeTripItem}>
            <input type="hidden" name="tripId" value={tripId} />
            <input type="hidden" name="itemId" value={item.id} />
            <button
              type="submit"
              aria-label="Remove"
              className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/item:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </form>
        </div>

        {item.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {item.description}
          </p>
        )}

        {item.whyRecommended && (
          <p className="mt-1.5 rounded-lg bg-primary/5 px-2.5 py-1.5 text-xs text-primary/90">
            <span className="font-semibold">Why · </span>
            {item.whyRecommended}
          </p>
        )}

        <div className="mt-2 flex items-center gap-3 text-xs">
          {item.locationLabel && (
            <span className="text-muted-foreground">{item.locationLabel}</span>
          )}
          <span className="font-medium text-foreground">
            {item.estimatedCost > 0
              ? `~${formatMYR(item.estimatedCost)}`
              : "Free"}
          </span>

          {item.bookable &&
            item.experienceId &&
            (booking ? (
              <Link
                href={`/bookings/${booking.id}`}
                className={cn(
                  "ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold",
                  booking.status === "confirmed"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                )}
              >
                <Check className="size-3" />
                {booking.status === "confirmed" ? "Booked" : "Reserved"}
              </Link>
            ) : (
              <Link
                href={`/book/${item.experienceId}?trip=${tripId}`}
                className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground transition-transform hover:scale-105"
              >
                <Ticket className="size-3" />
                Book
              </Link>
            ))}
        </div>
      </div>
    </li>
  );
}
