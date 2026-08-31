import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { adminGetBooking } from "@/lib/domain/admin";
import { formatDate, formatMYR } from "@/lib/format";
import { BOOKING_STATUS_META, type BookingStatus } from "@/types/booking";
import { updateBookingStatus } from "@/app/admin/bookings/actions";

export const metadata: Metadata = { title: "Admin · Booking" };

const NEXT_STATUS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "refunded"],
  completed: ["refunded"],
  cancelled: ["pending"],
  refunded: [],
};

export default async function AdminBookingDetail({
  params,
}: PageProps<"/admin/bookings/[bookingId]">) {
  const { bookingId } = await params;
  const b = await adminGetBooking(bookingId);
  if (!b) notFound();

  const meta = BOOKING_STATUS_META[b.status];
  const transitions = NEXT_STATUS[b.status];

  return (
    <div className="max-w-xl space-y-5">
      <Link
        href="/admin/bookings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Bookings
      </Link>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold leading-tight">
            {b.experienceTitle}
          </h1>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>
        <p className="text-sm text-muted-foreground">
          {b.vendorName}
          {b.locationName ? ` · ${b.locationName}` : ""} · ref{" "}
          {b.id.toUpperCase()}
        </p>
        <dl className="grid grid-cols-2 gap-3 pt-1 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Date &amp; time</dt>
            <dd className="font-medium">
              {formatDate(b.bookingDate, { weekday: "short", year: "numeric" })}{" "}
              {b.startTime}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Travellers</dt>
            <dd className="font-medium">
              {b.numAdults} adult{b.numAdults === 1 ? "" : "s"}
              {b.numChildren ? `, ${b.numChildren} child` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Customer</dt>
            <dd className="font-medium">{b.customerName}</dd>
            <dd className="text-xs text-muted-foreground">{b.customerEmail}</dd>
            {b.customerPhone && (
              <dd className="text-xs text-muted-foreground">
                {b.customerPhone}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total</dt>
            <dd className="font-medium">{formatMYR(b.totalAmount)}</dd>
            <dd className="text-xs text-muted-foreground">
              {formatMYR(b.subtotal)} + {formatMYR(b.serviceFee)} fee
            </dd>
          </div>
        </dl>
        {b.specialRequests && (
          <p className="rounded-lg bg-muted p-3 text-sm">
            <span className="font-medium">Requests: </span>
            {b.specialRequests}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Update status</p>
        {transitions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No further transitions from “{meta.label}”.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {transitions.map((s) => (
              <form key={s} action={updateBookingStatus}>
                <input type="hidden" name="bookingId" value={b.id} />
                <input type="hidden" name="status" value={s} />
                <Button
                  type="submit"
                  size="sm"
                  variant={s === "cancelled" || s === "refunded" ? "outline" : "default"}
                >
                  Mark {BOOKING_STATUS_META[s].label.toLowerCase()}
                </Button>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
