import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { deletionBlockers, todayInMalaysia, type DeletionBooking } from "@/lib/account-deletion";

export type DeleteAccountResult = { ok: true } | { error: string };

/**
 * Permanently delete the signed-in person's account and everything that hangs off it
 * (profile, trips, bookings, payments, reviews — all cascade from the account).
 *
 * The caller has already proven who they are (`requireUser()` + a typed confirmation); this
 * only decides whether it is safe, then deletes with the service role — a user can't delete
 * themselves with their own session. Refuses while a trip is upcoming or a refund is owed.
 */
export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  if (DEMO_MODE) return { ok: true }; // demo data isn't persisted; the caller ends the session

  const db = createAdminClient();
  const [{ data: profile }, { data: rows, error: bErr }] = await Promise.all([
    db.from("profiles").select("role").eq("id", userId).maybeSingle(),
    db.from("bookings").select("id, status, booking_date").eq("user_id", userId),
  ]);
  if (bErr) throw new Error(`delete account: ${bErr.message}`);

  const bookings: DeletionBooking[] = (rows ?? []).map((b) => ({
    id: b.id,
    status: b.status,
    bookingDate: b.booking_date,
  }));

  let paid = new Set<string>();
  if (bookings.length) {
    const { data: pays, error: pErr } = await db
      .from("payments")
      .select("booking_id")
      .in("booking_id", bookings.map((b) => b.id))
      .eq("status", "paid");
    if (pErr) throw new Error(`delete account: ${pErr.message}`);
    paid = new Set((pays ?? []).map((p) => p.booking_id));
  }

  const blockers = deletionBlockers({
    role: profile?.role === "admin" ? "admin" : "tourist",
    bookings,
    paidBookingIds: paid,
    today: todayInMalaysia(),
  });
  if (blockers.length) return { error: blockers.join(" ") };

  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw new Error(`delete account: ${error.message}`);
  return { ok: true };
}
