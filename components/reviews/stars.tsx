import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { starLabel } from "@/types/review";

/** Read-only star display. `value` may be fractional (e.g. 4.6). */
export function Stars({
  value,
  className,
  size = "size-4",
}: {
  value: number;
  className?: string;
  size?: string;
}) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={starLabel(Math.round(value))}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rounded >= i ? "full" : rounded >= i - 0.5 ? "half" : "none";
        return (
          <span key={i} className="relative">
            <Star className={cn(size, "text-amber-400")} aria-hidden />
            {fill !== "none" && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: fill === "half" ? "50%" : "100%" }}
                aria-hidden
              >
                <Star className={cn(size, "fill-amber-400 text-amber-400")} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
