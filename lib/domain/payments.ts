import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { demoStoreFor } from "@/lib/demo/store";
import { getBooking, setBookingStatus } from "@/lib/domain/bookings";
import { setTripStatus } from "@/lib/domain/trips";
import { getPaymentProvider } from "@/lib/payments";
import type { VerifiedPayment } from "@/lib/payments/types";
import { sendBookingConfirmation } from "@/lib/email";
import type { Payment, PaymentMethod } from "@/types/payment";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export async function getPaymentForBooking(
  userId: string,
  bookingId: string,
): Promise<Payment | null> {
  if (DEMO_MODE) {
    return (
      demoStoreFor(userId).payments.find((p) => p.bookingId === bookingId) ??
      null
    );
  }
  return null;
}

/**
 * Start a payment: snapshot the amount from the booking, create a payment
 * record, and open a provider session. Returns where to send the user.
 */
export async function startPayment(
  userId: string,
  bookingId: string,
  method: PaymentMethod,
): Promise<{ redirectUrl: string } | { error: string }> {
  const booking = await getBooking(userId, bookingId);
  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "pending") {
    return { error: "This booking isn't awaiting payment." };
  }

  const provider = getPaymentProvider();
  const session = await provider.createSession({
    bookingId,
    amount: booking.totalAmount, // server-side amount, never from the client
    currency: booking.currency,
    method,
    customerEmail: booking.customerEmail,
    customerName: booking.customerName,
    returnUrl: `/checkout/${bookingId}/result`,
  });

  const payment: Payment = {
    id: uid(),
    bookingId,
    provider: session.provider,
    providerRef: session.providerRef,
    providerPaymentId: null,
    amount: booking.totalAmount,
    currency: booking.currency,
    method,
    status: "created",
    createdAt: new Date().toISOString(),
    paidAt: null,
  };

  if (DEMO_MODE) {
    const store = demoStoreFor(userId);
    store.payments = store.payments.filter((p) => p.bookingId !== bookingId);
    store.payments.unshift(payment);
  }
  // TODO(phase-7): insert payment row (service-role) in Supabase

  return { redirectUrl: session.redirectUrl };
}

/**
 * Settle a payment from a provider callback. This is the ONLY place a booking
 * flips to `confirmed`. In real mode this runs in the webhook handler after
 * signature verification.
 */
export async function settlePayment(
  userId: string,
  params: Record<string, string>,
): Promise<{ status: "paid" | "failed" | "cancelled" }> {
  const provider = getPaymentProvider();
  const result = await provider.verify(params);

  const store = DEMO_MODE ? demoStoreFor(userId) : null;
  const payment = store?.payments.find(
    (p) => p.providerRef === result.providerRef,
  );

  // The provider's amount must match what we snapshotted at startPayment.
  // A callback that says "paid" for a different amount is tampered / stale —
  // never confirm the booking on it. (Real gateways: this runs *after* the
  // signature check in the webhook handler.)
  const amountOk =
    !!payment && Math.round(result.amount) === Math.round(payment.amount);
  const settledStatus: VerifiedPayment["status"] =
    result.status === "paid" && !amountOk ? "failed" : result.status;

  if (payment && payment.status !== "paid") {
    payment.status = settledStatus === "paid" ? "paid" : settledStatus;
    payment.providerPaymentId = result.providerPaymentId;
    payment.paidAt = settledStatus === "paid" ? new Date().toISOString() : null;

    if (settledStatus === "paid") {
      await setBookingStatus(userId, payment.bookingId, "confirmed");
      const booking = await getBooking(userId, payment.bookingId);
      if (booking) {
        await sendBookingConfirmation(booking);
        if (booking.tripId) {
          await setTripStatus(userId, booking.tripId, "booked");
        }
      }
    }
  }

  return {
    status:
      settledStatus === "paid"
        ? "paid"
        : settledStatus === "cancelled"
          ? "cancelled"
          : "failed",
  };
}
