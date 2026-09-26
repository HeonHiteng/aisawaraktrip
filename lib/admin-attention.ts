import type { Booking } from "@/types/booking";
import { formatMYR } from "@/lib/format";

/**
 * "Needs attention" for the admin overview — the things a person has to act on.
 * Pure (no I/O), so the rules are unit-tested. Ordered most urgent first.
 *
 *  - refund:    a booking was cancelled but the customer's payment is still `paid`
 *               (e.g. they paid after their seat hold lapsed and the slot had filled).
 *               Money is sitting with us; mark the booking "Refunded" once it's returned.
 *  - unpaid:    still "Awaiting payment" but the seat hold has lapsed, so the seats are
 *               already free again. Harmless, but the booking should be closed.
 *  - vendor:    a vendor is waiting for verification.
 */

export type AttentionKind = "refund" | "unpaid" | "vendor";

export interface AttentionItem {
  kind: AttentionKind;
  /** "high" = money or a customer is waiting on us. */
  severity: "high" | "low";
  title: string;
  detail: string;
  href: string;
}

export interface PaidPayment {
  bookingId: string;
  amount: number;
}

export interface AttentionInput {
  bookings: Booking[];
  /** Payments with status `paid` (money actually received). */
  paidPayments: PaidPayment[];
  unverifiedVendors: number;
  now?: Date;
}

/** Cap per kind so a bad day doesn't bury the page; the total is reported separately. */
export const ATTENTION_LIST_LIMIT = 8;

export interface Attention {
  items: AttentionItem[];
  /** Real counts per kind (the list above is capped). */
  counts: Record<AttentionKind, number>;
  total: number;
}

export function computeAttention(input: AttentionInput): Attention {
  const now = (input.now ?? new Date()).getTime();
  const paidByBooking = new Map<string, number>();
  for (const p of input.paidPayments) {
    paidByBooking.set(p.bookingId, (paidByBooking.get(p.bookingId) ?? 0) + p.amount);
  }

  const refunds: AttentionItem[] = [];
  const unpaid: AttentionItem[] = [];

  // oldest first: the customer who has waited longest for their money is at the top
  const oldestFirst = [...input.bookings].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const b of oldestFirst) {
    const href = `/admin/bookings/${b.id}`;
    const paid = paidByBooking.get(b.id);
    if (b.status === "cancelled" && paid !== undefined && paid > 0) {
      refunds.push({
        kind: "refund",
        severity: "high",
        title: `Refund ${formatMYR(paid)} to ${b.customerName}`,
        detail: `${b.experienceTitle} was cancelled after payment. Send the money back, then mark it Refunded.`,
        href,
      });
    } else if (
      b.status === "pending" &&
      b.holdExpiresAt &&
      new Date(b.holdExpiresAt).getTime() < now &&
      paid === undefined
    ) {
      unpaid.push({
        kind: "unpaid",
        severity: "low",
        title: `Unpaid: ${b.customerName}`,
        detail: `${b.experienceTitle} — the seat hold lapsed without payment. Cancel it to close it out.`,
        href,
      });
    }
  }

  const vendor: AttentionItem[] =
    input.unverifiedVendors > 0
      ? [
          {
            kind: "vendor",
            severity: "low",
            title: `${input.unverifiedVendors} vendor${input.unverifiedVendors === 1 ? "" : "s"} awaiting verification`,
            detail: "Travellers see a vendor as verified only once you approve it.",
            href: "/admin/vendors",
          },
        ]
      : [];

  const counts: Record<AttentionKind, number> = {
    refund: refunds.length,
    unpaid: unpaid.length,
    vendor: input.unverifiedVendors,
  };
  return {
    items: [
      ...refunds.slice(0, ATTENTION_LIST_LIMIT),
      ...unpaid.slice(0, ATTENTION_LIST_LIMIT),
      ...vendor,
    ],
    counts,
    total: counts.refund + counts.unpaid + counts.vendor,
  };
}
