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

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        done
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-border bg-card shadow-card",
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
          <div
            className="mt-2.5 flex gap-1"
            role="progressbar"
            aria-valuenow={booked}
            aria-valuemin={0}
            aria-valuemax={total}
          >
            {Array.from({ length: total }).map((_, i) => (
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
  );
}
