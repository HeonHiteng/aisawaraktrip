"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BOOKING_STATUS_META, type BookingStatus } from "@/types/booking";

const STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
];

export function BookingFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const status = params.get("status") ?? "";
  const q = params.get("q") ?? "";

  const update = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v) sp.set(k, v);
        else sp.delete(k);
      }
      start(() => router.replace(`${pathname}?${sp.toString()}`));
    },
    [params, pathname, router],
  );

  return (
    <div className={cn("space-y-3", pending && "opacity-70")}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search bookings"
          defaultValue={q}
          placeholder="Customer, email or reference…"
          className="pl-9"
          onChange={(e) => update({ q: e.target.value || null })}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={status === ""}
          onClick={() => update({ status: null })}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            status === ""
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => update({ status: status === s ? null : s })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              status === s
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {BOOKING_STATUS_META[s].label}
          </button>
        ))}
      </div>
    </div>
  );
}
