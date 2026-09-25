import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { demoStoreFor } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBooking, setBookingStatus } from "@/lib/domain/bookings";
import { setTripStatus } from "@/lib/domain/trips";
import { isUuid } from "@/lib/domain/mappers/catalogue";
import {
  bookingFromRow,
  parseSettleOutcome,
  paymentFromRow,
} from "@/lib/domain/mappers/bookings";
import { getPaymentProvider } from "@/lib/payments";
import type { VerifiedPayment } from "@/lib/payments/types";
import { sendBookingConfirmation } from "@/lib/email";
import type { Json } from "@/types/database";
import type { Payment, PaymentMethod } from "@/types/payment";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export type SettleStatus = "paid" | "failed" | "cancelled" | "pending";

/** The traveller's latest payment attempt for a booking (RLS: theirs only). */
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
  if (!isUuid(bookingId)) return null;
  const db = await createClient();
  const { data, error } = await db
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`payment: ${error.message}`);
  return data ? paymentFromRow(data) : null;
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

  if (DEMO_MODE) {
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
    const store = demoStoreFor(userId);
    store.payments = store.payments.filter((p) => p.bookingId !== bookingId);
    store.payments.unshift(payment);
    return { redirectUrl: session.redirectUrl };
  }

  // Every attempt is its own row (an audit trail of tries); the latest one wins on read.
  const { error } = await createAdminClient().from("payments").insert({
    booking_id: bookingId,
    provider: session.provider,
    provider_ref: session.providerRef,
    amount: booking.totalAmount,
    currency: booking.currency,
    method,
    status: "created",
  });
  if (error) throw new Error(`start payment: ${error.message}`);
  return { redirectUrl: session.redirectUrl };
}

/**
 * Settle a payment from a provider callback. This is the ONLY place a booking
 * flips to `confirmed`.
 *
 * `userId` is the signed-in traveller on the return-from-gateway path (they may
 * only settle their own payment); pass `null` from a provider webhook, which has
 * no session and is authenticated by its signature instead.
 *
 * Real mode delegates to the `settle_payment` SQL function: one transaction,
 * idempotent, amount-checked against the snapshot taken in `startPayment`. The
 * confirmation email is sent only by the call that actually did the confirming.
 */
export async function settlePayment(
  userId: string | null,
  params: Record<string, string>,
): Promise<{ status: SettleStatus }> {
  const provider = getPaymentProvider();
  const result = await provider.verify(params);

  if (DEMO_MODE) {
    if (!userId) return { status: "failed" }; // demo has no external webhook
    return settleDemo(userId, result);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("settle_payment", {
    p_provider: provider.name,
    p_provider_ref: result.providerRef,
    p_status: result.status,
    p_amount: result.amount,
    p_raw: result.raw as Json,
    p_provider_payment_id: result.providerPaymentId ?? undefined,
    p_expected_user: userId ?? undefined,
  });
  if (error) throw new Error(`settle payment: ${error.message}`);

  const out = parseSettleOutcome(data);

  if (out.result === "unknown") {
    console.warn("[payments] callback for an unknown payment reference", result.providerRef);
    return { status: "failed" };
  }

  if (out.confirmedNow && out.bookingId) {
    const { data: row } = await admin
      .from("bookings")
      .select("*")
      .eq("id", out.bookingId)
      .maybeSingle();
    if (row) {
      try {
        await sendBookingConfirmation(bookingFromRow(row));
      } catch (e) {
        // The booking IS confirmed and paid; a mail failure must not fail the callback.
        console.error("[payments] confirmation email failed", out.bookingId, e);
      }
    }
  } else if (out.result === "paid" && out.bookingStatus !== "confirmed") {
    // Money arrived for a booking that is no longer pending (e.g. cancelled while at
    // the gateway). It is recorded but does not revive the booking — needs a refund.
    console.error(
      "[payments] PAID BUT BOOKING NOT CONFIRMABLE — refund needed",
      { bookingId: out.bookingId, bookingStatus: out.bookingStatus, providerRef: result.providerRef },
    );
  }

  return {
    status:
      out.result === "paid"
        ? "paid"
        : out.result === "cancelled"
          ? "cancelled"
          : out.result === "pending"
            ? "pending"
            : "failed",
  };
}

/** Demo-mode settlement against the in-memory store (unchanged behaviour). */
async function settleDemo(
  userId: string,
  result: VerifiedPayment,
): Promise<{ status: SettleStatus }> {
  const store = demoStoreFor(userId);
  const payment = store.payments.find(
    (p) => p.providerRef === result.providerRef,
  );

  // The provider's amount must match what we snapshotted at startPayment.
  // A callback that says "paid" for a different amount is tampered / stale —
  // never confirm the booking on it.
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
          : settledStatus === "pending"
            ? "pending"
            : "failed",
  };
}
