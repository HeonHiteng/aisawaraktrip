import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { requireUser } from "@/lib/auth";
import { getBooking } from "@/lib/domain/bookings";
import { formatDate, formatMYR } from "@/lib/format";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({
  params,
}: PageProps<"/checkout/[bookingId]">) {
  const { bookingId } = await params;
  const user = await requireUser();
  const booking = await getBooking(user.id, bookingId);
  if (!booking) notFound();
  if (booking.status !== "pending") {
    redirect(`/bookings/${bookingId}`);
  }

  return (
    <div className="space-y-5">
      <Link
        href={`/bookings/${bookingId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to booking
      </Link>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">{booking.experienceTitle}</p>
        <p className="text-xs text-muted-foreground">
          {booking.vendorName} ·{" "}
          {formatDate(booking.bookingDate, { year: "numeric" })}{" "}
          {booking.startTime} · {booking.numPax} pax
        </p>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatMYR(booking.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Service fee</dt>
            <dd>{formatMYR(booking.serviceFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
            <dt>Total due</dt>
            <dd>{formatMYR(booking.totalAmount)}</dd>
          </div>
        </dl>
      </div>

      <CheckoutForm bookingId={bookingId} />
    </div>
  );
}
