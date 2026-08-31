import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getBooking } from "@/lib/domain/bookings";
import { getPaymentForBooking } from "@/lib/domain/payments";
import { formatDate, formatMYR } from "@/lib/format";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-5 text-center">
      {paid ? (
        <>
          <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
          <div>
            <h1 className="text-xl font-bold">Payment received</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your booking is confirmed. A receipt is on its way to{" "}
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
        <Link
          href={`/bookings/${bookingId}`}
          className={cn(buttonVariants({ size: "lg" }), "bg-brand-gradient text-white")}
        >
          View booking
        </Link>
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
