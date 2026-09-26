/**
 * Slot capacity policy, shared by the app and the (demo) store.
 *
 * An UNPAID booking holds its seats for HOLD_MINUTES, then they are released for
 * others — the database just stops counting a pending booking once its hold has
 * expired, so no clean-up job is needed. Checkout renews the hold if seats remain.
 * (The SQL functions take the minutes as an argument; this is the one place it is set.)
 */
export const HOLD_MINUTES = 30;

export function holdUntil(from: Date = new Date()): string {
  return new Date(from.getTime() + HOLD_MINUTES * 60_000).toISOString();
}

/** What to tell someone whose booking didn't fit. `left` = seats remaining in that slot. */
export function slotFullMessage(left: number): string {
  if (left <= 0) {
    return "That time is fully booked. Please pick another time or date.";
  }
  return `Only ${left} seat${left === 1 ? "" : "s"} left for that time. Reduce the group size or pick another time.`;
}

export const SLOT_FULL_AT_CHECKOUT =
  "Sorry — that time filled up while you were checking out. Please pick another time or date.";
