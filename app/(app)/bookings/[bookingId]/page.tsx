import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, CreditCard, MapPin } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { requireUser } from "@/lib/auth";
import { getBooking } from "@/lib/domain/bookings";
import { formatDate, formatMYR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BOOKING_STATUS_META } from "@/types/booking";
import { cancelBooking } from "@/app/(app)/bookings/actions";

export async function generateMetadata({
  params,
}: PageProps<"/bookings/[bookingId]">): Promise<Metadata> {
  const { bookingId } = await params;
  const user = await requireUser();
  const b = await getBooking(user.id, bookingId);
  return { title: b ? `Booking · ${b.experienceTitle}` : "Booking" };
}

export default async function BookingDetailPage({
  params,
}: PageProps<"/bookings/[bookingId]">) {
  const { bookingId } = await params;
  const user = await requireUser();
  const b = await getBooking(user.id, bookingId);
  if (!b) notFound();

  const meta = BOOKING_STATUS_META[b.status];
  const canCancel = b.status === "pending" || b.status === "confirmed";

  return (
    <div className="space-y-5">
      <Link
        href="/bookings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        My Bookings
      </Link>

      {b.status === "pending" && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Awaiting payment
            </p>
            <p className="text-muted-foreground">
              Your spot is held. Pay now to confirm it.
            </p>
            <Link
              href={`/checkout/${b.id}`}
              className={cn(
                buttonVariants({ size: "sm" }),
                "mt-2 bg-brand-gradient text-white",
              )}
            >
              <CreditCard className="size-4" />
              Pay {formatMYR(b.totalAmount)}
            </Link>
          </div>
        </div>
      )}
      {b.status === "confirmed" && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <p className="font-medium text-emerald-700 dark:text-emerald-400">
            Booking confirmed — see you there!
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold leading-tight">
            {b.experienceTitle}
          </h1>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>
        <p className="text-sm text-muted-foreground">
          {b.vendorName}
          {b.locationName ? ` · ${b.locationName}` : ""}
        </p>
        <dl className="grid grid-cols-2 gap-3 pt-1 text-sm">
          <Field label="Date">
            {formatDate(b.bookingDate, { weekday: "short", year: "numeric" })}
          </Field>
          <Field label="Time">{b.startTime}</Field>
          <Field label="Travellers">
            {b.numAdults} adult{b.numAdults === 1 ? "" : "s"}
            {b.numChildren ? `, ${b.numChildren} child` : ""}
          </Field>
          <Field label="Reference">{b.id.toUpperCase()}</Field>
        </dl>
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <p className="font-semibold">Price</p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {formatMYR(b.unitPrice)} × {b.numPax}
          </span>
          <span>{formatMYR(b.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service fee</span>
          <span>{formatMYR(b.serviceFee)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-semibold">
          <span>Total</span>
          <span>{formatMYR(b.totalAmount)}</span>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <p className="font-semibold">Lead traveller</p>
        <p>{b.customerName}</p>
        <p className="text-muted-foreground">{b.customerEmail}</p>
        {b.customerPhone && (
          <p className="text-muted-foreground">{b.customerPhone}</p>
        )}
        {b.specialRequests && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Notes: </span>
            {b.specialRequests}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/explore/experiences/${b.experienceSlug}`}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
        >
          <MapPin className="size-4" />
          View experience
        </Link>

        {b.status === "pending" && (
          <Link
            href={`/checkout/${b.id}`}
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-brand-gradient text-white",
            )}
          >
            <CreditCard className="size-4" />
            Pay now
          </Link>
        )}

        {canCancel && (
          <form action={cancelBooking} className="ml-auto">
            <input type="hidden" name="bookingId" value={b.id} />
            <input
              type="hidden"
              name="reason"
              value="Cancelled by traveller"
            />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Cancel booking
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
