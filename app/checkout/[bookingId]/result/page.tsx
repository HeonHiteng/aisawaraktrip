import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, PartyPopper, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getBooking, bookingsForTrip } from "@/lib/domain/bookings";
import { getPaymentForBooking } from "@/lib/domain/payments";
import { getTrip } from "@/lib/domain/trips";
import { formatDate, formatMYR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { bookableExperiences } from "@/types/trip";

export const metadata: Metadata = { title: "Payment result" };

export default async function PaymentResultPage({
  params,
}: PageProps<"/checkout/[bookingId]/result">) {
  const { bookingId } = await params;
  const user = await requireUser();
  const [booking, payment] = await Promise.all([
    getBooking(user.id, bookingId),
    getPaymentForBooking(user.id, bookingId),
  ]);
  if (!booking) notFound();

  const paid = booking.status === "confirmed" && payment?.status === "paid";

  // If this booking belongs to a trip, work out what's still unbooked so we can
  // keep the traveller moving instead of dumping them on the bookings list.
  let trip = null;
  let nextUp: { experienceId: string; title: string } | null = null;
  let tripAllBooked = false;
  if (paid && booking.tripId) {
    const t = await getTrip(user.id, booking.tripId);
    if (t?.itinerary) {
      trip = t;
      const tripBookings = await bookingsForTrip(user.id, t.id);
      const bookedIds = new Set(tripBookings.map((b) => b.experienceId));
      const remaining = bookableExperiences(t.itinerary).filter(
        (e) => !bookedIds.has(e.experienceId),
      );
      nextUp = remaining[0] ?? null;
      tripAllBooked = remaining.length === 0;
    }
  }

  return (
    <div className="space-y-5 text-center">
      {paid ? (
        <>
          {tripAllBooked ? (
            <PartyPopper className="mx-auto size-14 text-emerald-500" />
          ) : (
            <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
          )}
          <div>
            <h1 className="text-xl font-bold">
              {tripAllBooked ? "Your trip is all booked" : "Payment received"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tripAllBooked
                ? "Every experience on this trip is confirmed. A receipt is on its way to "
                : "Your booking is confirmed. A receipt is on its way to "}
              {booking.customerEmail}.
            </p>
          </div>
        </>
      ) : (
        <>
          <XCircle className="mx-auto size-14 text-destructive" />
          <div>
            <h1 className="text-xl font-bold">Payment not completed</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your spot is still held. You can try paying again.
            </p>
          </div>
        </>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 text-left text-sm">
        <p className="font-semibold">{booking.experienceTitle}</p>
        <p className="text-xs text-muted-foreground">
          {booking.vendorName} ·{" "}
          {formatDate(booking.bookingDate, { year: "numeric" })}{" "}
          {booking.startTime}
        </p>
        <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
          <span>{paid ? "Paid" : "Amount due"}</span>
          <span>{formatMYR(booking.totalAmount)}</span>
        </div>
        {payment && (
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {payment.provider} · {payment.providerRef}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {paid && nextUp && trip ? (
          <Link
            href={`/book/${nextUp.experienceId}?trip=${trip.id}`}
            className={buttonVariants({ variant: "brand", size: "lg" })}
          >
            Book next: {nextUp.title}
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <Link
            href={`/bookings/${bookingId}`}
            className={buttonVariants({ variant: "brand", size: "lg" })}
          >
            View booking
          </Link>
        )}

        {paid && trip && (
          <Link
            href={`/trips/${trip.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            {tripAllBooked ? "See your trip" : "Back to trip"}
          </Link>
        )}

        {paid && nextUp && trip && (
          <Link
            href={`/bookings/${bookingId}`}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            View this booking
          </Link>
        )}

        {!paid && (
          <Link
            href={`/checkout/${bookingId}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Try again
          </Link>
        )}
      </div>
    </div>
  );
}
