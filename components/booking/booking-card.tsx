import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDate, formatMYR } from "@/lib/format";
import { BOOKING_STATUS_META, type Booking } from "@/types/booking";

export function BookingCard({ booking }: { booking: Booking }) {
  const meta = BOOKING_STATUS_META[booking.status];
  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="block rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug">{booking.experienceTitle}</h3>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{booking.vendorName}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {formatDate(booking.bookingDate, { year: "numeric" })} ·{" "}
          {booking.startTime}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" />
          {booking.numPax} {booking.numPax === 1 ? "person" : "people"}
        </span>
        <span className="font-medium text-foreground">
          {formatMYR(booking.totalAmount)}
        </span>
      </div>
    </Link>
  );
}
