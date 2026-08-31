import { CheckCircle2, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

export function TripReadiness({
  booked,
  total,
}: {
  booked: number;
  total: number;
}) {
  const done = booked >= total;
  const pct = Math.round((booked / total) * 100);

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        done
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        {done ? (
          <CheckCircle2 className="size-4 text-emerald-600" />
        ) : (
          <Ticket className="size-4 text-primary" />
        )}
        {done
          ? "Everything's booked — you're all set"
          : `${booked} of ${total} experience${total === 1 ? "" : "s"} booked`}
      </div>
      {!done && (
        <>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand-gradient"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Tap “Book” on the experiences below to lock in your spots.
          </p>
        </>
      )}
    </div>
  );
}
