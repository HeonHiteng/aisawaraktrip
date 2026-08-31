import Link from "next/link";
import {
  Check,
  Coffee,
  Compass,
  Landmark,
  Sparkles,
  Ticket,
  Car,
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

  return (
    <div className="relative flex gap-3 py-3">
      <div className="flex w-12 shrink-0 flex-col items-end pt-0.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{item.startTime}</span>
        <span>{item.endTime}</span>
      </div>

      <div className="flex flex-1 gap-3 border-l border-border pl-3">
        <div
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
            item.type === "experience"
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium leading-snug">{item.title}</p>
            <form action={removeTripItem}>
              <input type="hidden" name="tripId" value={tripId} />
              <input type="hidden" name="itemId" value={item.id} />
              <button
                type="submit"
                aria-label="Remove item"
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </form>
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
          {item.whyRecommended && (
            <p className="text-xs text-primary/90">
              <span className="font-medium">Why: </span>
              {item.whyRecommended}
            </p>
          )}

          <div className="flex items-center gap-3 pt-0.5 text-xs">
            {item.locationLabel && (
              <span className="text-muted-foreground">{item.locationLabel}</span>
            )}
            <span className="text-muted-foreground">
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
                  className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
                >
                  <Ticket className="size-3" />
                  Book
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
