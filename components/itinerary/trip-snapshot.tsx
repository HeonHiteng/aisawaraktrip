import { CheckCircle2, Ticket } from "lucide-react";
import { formatMYR } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The "where this trip stands" card on the trip detail page — budget on top,
 * booking progress below. Replaces the separate BudgetBar + TripReadiness
 * cards so the itinerary itself sits higher on the page.
 */
export function TripSnapshot({
  estimated,
  budget,
  pax,
  booked,
  bookableTotal,
}: {
  estimated: number;
  budget: number | null;
  pax: number;
  booked: number;
  bookableTotal: number;
}) {
  const totalBudget = budget != null ? budget * pax : null;
  const pct =
    totalBudget && totalBudget > 0
      ? Math.min(100, Math.round((estimated / totalBudget) * 100))
      : null;
  const over = totalBudget != null && estimated > totalBudget;
  const travellers = `${pax} ${pax === 1 ? "traveller" : "travellers"}`;

  const allBooked = bookableTotal > 0 && booked >= bookableTotal;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {/* budget */}
      <div className="p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">Estimated cost</p>
          <p className="text-sm">
            <span className="font-semibold">~{formatMYR(estimated)}</span>
            {totalBudget != null && (
              <span className="text-muted-foreground">
                {" "}
                / {formatMYR(totalBudget)}
              </span>
            )}
          </p>
        </div>
        {pct != null && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                over ? "bg-destructive" : "bg-brand-gradient",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          {totalBudget == null
            ? `For ${travellers}. Add a budget on the plan form to track it.`
            : over
              ? `About ${formatMYR(estimated - totalBudget)} over budget — try “make it cheaper”.`
              : `Within budget for ${travellers}.`}
        </p>
      </div>

      {/* booking progress */}
      {bookableTotal > 0 && (
        <div
          className={cn(
            "border-t px-4 py-3",
            allBooked
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-border",
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {allBooked ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <Ticket className="size-4 text-primary" />
            )}
            {allBooked
              ? "Everything's booked — you're all set"
              : `${booked} of ${bookableTotal} experience${
                  bookableTotal === 1 ? "" : "s"
                } booked`}
          </div>
          {!allBooked && (
            <>
              <div
                className="mt-2 flex gap-1"
                role="progressbar"
                aria-valuenow={booked}
                aria-valuemin={0}
                aria-valuemax={bookableTotal}
              >
                {Array.from({ length: bookableTotal }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      i < booked ? "bg-brand-gradient" : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Tap “Book” on the experiences below to lock in your spots.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
