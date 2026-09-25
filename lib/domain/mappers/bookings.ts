import type { Tables, TablesInsert } from "@/types/database";
import type { Booking, BookingInput } from "@/types/booking";
import type { Payment } from "@/types/payment";

/**
 * Domain <-> database mappers for bookings and payments. Pure, so the money
 * mapping is unit-tested.
 */

/** "09:00:00" (Postgres time) -> "09:00". */
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

/** Money is MYR to the sen; float sums (0.1 + 0.2) must not reach a CHECK constraint. */
const sen = (n: number) => Math.round(n * 100) / 100;

export function bookingFromRow(r: Tables<"bookings">): Booking {
  return {
    id: r.id,
    userId: r.user_id,
    experienceId: r.experience_id,
    tripId: r.trip_id,
    bookingDate: r.booking_date,
    startTime: hhmm(r.start_time),
    numAdults: r.num_adults,
    numChildren: r.num_children,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    customerPhone: r.customer_phone,
    specialRequests: r.special_requests,
    // snapshotted at booking time — never re-read from the (editable) listing
    experienceTitle: r.experience_title,
    experienceSlug: r.experience_slug,
    vendorName: r.vendor_name,
    locationName: r.location_name,
    unitPrice: Number(r.unit_price),
    numPax: r.num_pax ?? r.num_adults + r.num_children,
    subtotal: Number(r.subtotal),
    serviceFee: Number(r.service_fee),
    totalAmount: Number(r.total_amount),
    currency: r.currency,
    status: r.status,
    createdAt: r.created_at,
  };
}

/** What `createBooking` inserts: identity from the session, money from the catalogue. */
export function bookingToInsert(
  userId: string,
  input: BookingInput,
  snapshot: {
    experienceTitle: string;
    experienceSlug: string;
    vendorName: string;
    locationName: string | null;
    unitPrice: number;
    subtotal: number;
    serviceFee: number;
    totalAmount: number;
    currency: string;
  },
): TablesInsert<"bookings"> {
  return {
    user_id: userId,
    experience_id: input.experienceId,
    trip_id: input.tripId,
    booking_date: input.bookingDate,
    start_time: input.startTime || null,
    num_adults: input.numAdults,
    num_children: input.numChildren,
    unit_price: sen(snapshot.unitPrice),
    subtotal: sen(snapshot.subtotal),
    service_fee: sen(snapshot.serviceFee),
    total_amount: sen(snapshot.totalAmount),
    currency: snapshot.currency,
    status: "pending",
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    customer_phone: input.customerPhone,
    special_requests: input.specialRequests,
    experience_title: snapshot.experienceTitle,
    experience_slug: snapshot.experienceSlug,
    vendor_name: snapshot.vendorName,
    location_name: snapshot.locationName,
  };
}

export function paymentFromRow(r: Tables<"payments">): Payment {
  return {
    id: r.id,
    bookingId: r.booking_id,
    provider: r.provider,
    providerRef: r.provider_ref ?? "",
    providerPaymentId: r.provider_payment_id,
    amount: Number(r.amount),
    currency: r.currency,
    method: r.method,
    status: r.status,
    createdAt: r.created_at,
    paidAt: r.paid_at,
  };
}

/** Shape returned by the `settle_payment` SQL function. */
export interface SettleOutcome {
  result: "paid" | "failed" | "cancelled" | "pending" | "refunded" | "created" | "unknown";
  confirmedNow: boolean;
  bookingId: string | null;
  userId: string | null;
  bookingStatus: string | null;
}

/** The RPC returns loosely-typed JSON; never trust its shape blindly. */
export function parseSettleOutcome(data: unknown): SettleOutcome {
  const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const result = typeof o.result === "string" ? o.result : "unknown";
  const known = ["paid", "failed", "cancelled", "pending", "refunded", "created", "unknown"];
  return {
    result: (known.includes(result) ? result : "unknown") as SettleOutcome["result"],
    confirmedNow: o.confirmed_now === true,
    bookingId: typeof o.booking_id === "string" ? o.booking_id : null,
    userId: typeof o.user_id === "string" ? o.user_id : null,
    bookingStatus: typeof o.booking_status === "string" ? o.booking_status : null,
  };
}
