/**
 * Deleting an account removes the person's trips, bookings, payments and reviews (they cascade
 * from the account). That is right once nothing is owed either way, but it must never quietly
 * erase a trip a vendor is expecting, or a refund we still owe. Pure, so the rules are tested.
 */

export interface DeletionBooking {
  id: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "refunded";
  /** yyyy-mm-dd */
  bookingDate: string;
}

export interface DeletionCheck {
  role: "tourist" | "admin";
  bookings: DeletionBooking[];
  /** Ids of bookings that have a payment with status `paid` (money actually received). */
  paidBookingIds: ReadonlySet<string>;
  /** yyyy-mm-dd, today in the traveller's calendar (Malaysia). */
  today: string;
}

export const DELETE_CONFIRM_WORD = "DELETE";

/** Reasons the account can't be deleted right now; empty means it can. */
export function deletionBlockers(c: DeletionCheck): string[] {
  const out: string[] = [];
  if (c.role === "admin") {
    out.push("Admin accounts can't be deleted here. Ask another admin to change your role first.");
  }
  const upcoming = c.bookings.filter((b) => b.status === "confirmed" && b.bookingDate >= c.today).length;
  if (upcoming > 0) {
    out.push(
      `You have ${upcoming} upcoming confirmed booking${upcoming === 1 ? "" : "s"}. Cancel ${upcoming === 1 ? "it" : "them"} first (Bookings), then delete your account.`,
    );
  }
  const refundsDue = c.bookings.filter((b) => b.status === "cancelled" && c.paidBookingIds.has(b.id)).length;
  if (refundsDue > 0) {
    out.push(
      `A refund for ${refundsDue} cancelled booking${refundsDue === 1 ? " is" : "s are"} still being processed. You can delete your account once ${refundsDue === 1 ? "it's" : "they're"} refunded.`,
    );
  }
  return out;
}

/** Today's date in Malaysia (UTC+8), as yyyy-mm-dd. */
export function todayInMalaysia(now: Date = new Date()): string {
  return new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
}
