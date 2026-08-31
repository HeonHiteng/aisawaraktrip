import { describe, expect, it } from "vitest";
import { createBooking, getBooking } from "@/lib/domain/bookings";
import { startPayment, settlePayment } from "@/lib/domain/payments";
import type { Booking } from "@/types/booking";

let seq = 0;
const nextUser = () => `settle-test-user-${Date.now()}-${seq++}`;

/**
 * settlePayment is the ONLY place a booking flips to `confirmed`. It must
 * reject a callback whose amount doesn't match the server-snapshotted amount,
 * even when the callback claims "paid".
 */
async function freshBooking(userId: string): Promise<Booking> {
  const result = await createBooking(userId, {
    experienceId: "exp-cruise", // runs every day, min 2 pax, RM180pp
    tripId: null,
    bookingDate: "2026-12-15",
    startTime: "15:30",
    numAdults: 2,
    numChildren: 0,
    customerName: "Test Traveller",
    customerEmail: "test@example.com",
    customerPhone: null,
    specialRequests: null,
  });
  if ("error" in result) throw new Error(result.error);
  return result;
}

function paramsFromRedirect(redirectUrl: string) {
  const url = new URL(redirectUrl, "http://localhost");
  return {
    ref: url.searchParams.get("ref") ?? "",
    amount: url.searchParams.get("amount") ?? "",
    method: url.searchParams.get("method") ?? "fpx",
  };
}

describe("settlePayment amount verification", () => {
  it("does NOT confirm when the callback amount is tampered", async () => {
    const userId = nextUser();
    const booking = await freshBooking(userId);
    const started = await startPayment(userId, booking.id, "fpx");
    expect("redirectUrl" in started).toBe(true);
    const p = paramsFromRedirect((started as { redirectUrl: string }).redirectUrl);

    const settled = await settlePayment(userId, {
      ref: p.ref,
      outcome: "approve",
      amount: String(Number(p.amount) - 50), // tampered
      method: p.method,
    });

    expect(settled.status).toBe("failed");
    const after = await getBooking(userId, booking.id);
    expect(after?.status).toBe("pending");
  });

  it("confirms when the callback amount matches the snapshot", async () => {
    const userId = nextUser();
    const booking = await freshBooking(userId);
    const started = await startPayment(userId, booking.id, "fpx");
    const p = paramsFromRedirect((started as { redirectUrl: string }).redirectUrl);

    const settled = await settlePayment(userId, {
      ref: p.ref,
      outcome: "approve",
      amount: p.amount,
      method: p.method,
    });

    expect(settled.status).toBe("paid");
    const after = await getBooking(userId, booking.id);
    expect(after?.status).toBe("confirmed");
  });
});
