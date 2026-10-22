import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { isHoldLapsed } from "@/lib/booking-hold";
import { formatDate, formatMYR } from "@/lib/format";
import { DEFAULT_PHOTO } from "@/lib/photo-credits";
import { BOOKING_STATUS_META, type Booking } from "@/types/booking";

/** `imageUrl`: the booked experience's photo (lib/card-photos `bookingPhoto`). */
export function BookingCard({
  booking,
  imageUrl,
}: {
  booking: Booking;
  imageUrl?: string;
}) {
  const meta = BOOKING_STATUS_META[booking.status];
  const lapsed = isHoldLapsed(booking);
  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="group flex overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative w-24 shrink-0 bg-muted">
        <Image
          src={imageUrl ?? DEFAULT_PHOTO}
          alt=""
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold leading-snug">
            {booking.experienceTitle}
          </h3>
          <StatusBadge
            label={lapsed ? "Hold expired" : meta.label}
            tone={meta.tone}
          />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {booking.vendorName}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDate(booking.bookingDate, { year: "numeric" })} ·{" "}
            {booking.startTime}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" aria-hidden />
            {booking.numPax} {booking.numPax === 1 ? "person" : "people"}
          </span>
          <span className="font-medium text-foreground">
            {formatMYR(booking.totalAmount)}
          </span>
        </div>
      </div>
    </Link>
  );
}
