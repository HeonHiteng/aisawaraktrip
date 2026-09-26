import { describe, expect, it, vi } from "vitest";
import { createBooking, getBooking, setBookingStatus } from "@/lib/domain/bookings";
import { settlePayment, startPayment } from "@/lib/domain/payments";
import { HOLD_MINUTES, holdUntil, isHoldLapsed, slotFullMessage } from "@/lib/booking-hold";
import type { Booking, BookingInput } from "@/types/booking";

/**
 * Demo-mode slot capacity. Mirrors the SQL rules tested in tests/db/capacity.test.ts:
 * confirmed/completed bookings and UNEXPIRED unpaid holds take seats; cancelled,
 * refunded and lapsed ones don't. The Santubong cruise runs daily at 15:30, 2–20 pax,
 * capacity 20 per slot. Each test uses its own date, so slots never interfere.
 */

let seq = 0;
const nextUser = () => `slot-capacity-user-${Date.now()}-${seq++}`;

const input = (date: string, pax: number): BookingInput => ({
  experienceId: "exp-cruise",
  tripId: null,
  bookingDate: date,
  startTime: "15:30",
  numAdults: pax,
  numChildren: 0,
  customerName: "Test Traveller",
  customerEmail: "test@example.com",
  customerPhone: null,
  specialRequests: null,
});

async function book(date: string, pax: number, user = nextUser()): Promise<Booking> {
  const r = await createBooking(user, input(date, pax));
  if ("error" in r) throw new Error(r.error);
  return r;
}

async function refused(date: string, pax: number) {
  const r = await createBooking(nextUser(), input(date, pax));
  if (!("error" in r)) throw new Error("expected the booking to be refused");
  return r.error;
}

/** Simulate time passing: this unpaid booking's hold has now lapsed. */
const lapse = (b: Booking) => {
  b.holdExpiresAt = new Date(Date.now() - 1000).toISOString();
};

describe("hold policy", () => {
  it("holds for HOLD_MINUTES", () => {
    const from = new Date("2026-12-01T10:00:00Z");
    expect(new Date(holdUntil(from)).getTime() - from.getTime()).toBe(HOLD_MINUTES * 60_000);
  });

  it("messages say how many seats are left", () => {
    expect(slotFullMessage(2)).toMatch(/Only 2 seats left/);
    expect(slotFullMessage(1)).toMatch(/Only 1 seat left/);
    expect(slotFullMessage(0)).toMatch(/fully booked/);
  });
});

describe("createBooking and capacity", () => {
  it("fills a slot exactly, then refuses and says how many seats remain", async () => {
    const d = "2027-01-05";
    await book(d, 10);
    await book(d, 8); // 18 / 20
    expect(await refused(d, 3)).toMatch(/Only 2 seats left/);
    await book(d, 2); // exactly full
    expect(await refused(d, 2)).toMatch(/fully booked/);
  });

  it("a new booking holds its seats until the hold expires", async () => {
    const b = await book("2027-01-06", 4);
    expect(new Date(b.holdExpiresAt!).getTime()).toBeGreaterThan(Date.now() + (HOLD_MINUTES - 1) * 60_000);
  });

  it("other dates have their own seats", async () => {
    await book("2027-01-07", 20);
    await expect(book("2027-01-08", 20)).resolves.toBeDefined();
  });

  it("cancelling frees seats; so does a lapsed unpaid hold", async () => {
    const d = "2027-01-09";
    const first = await book(d, 20);
    expect(await refused(d, 2)).toMatch(/fully booked/);

    await setBookingStatus(first.userId, first.id, "cancelled");
    const second = await book(d, 20); // freed
    expect(await refused(d, 2)).toMatch(/fully booked/);

    lapse(second);
    await expect(book(d, 20)).resolves.toBeDefined();
  });

  it("confirmed bookings keep their seats even long after their hold time", async () => {
    const d = "2027-01-10";
    const b = await book(d, 20);
    await setBookingStatus(b.userId, b.id, "confirmed");
    lapse(b); // irrelevant once confirmed
    expect(await refused(d, 2)).toMatch(/fully booked/);
  });
});

describe("checkout and late payment", () => {
  const start = async (b: Booking) => {
    const r = await startPayment(b.userId, b.id, "mock");
    if ("error" in r) return r;
    const q = new URL(r.redirectUrl, "http://x").searchParams;
    return { ref: q.get("ref")!, amount: q.get("amount")! };
  };

  it("checkout renews a lapsed hold when the seats are still free", async () => {
    const b = await book("2027-01-12", 4);
    lapse(b);
    const r = await start(b);
    expect("error" in r).toBe(false);
    expect(new Date((await getBooking(b.userId, b.id))!.holdExpiresAt!).getTime()).toBeGreaterThan(Date.now());
  });

  it("…but not when someone else has taken them meanwhile", async () => {
    const d = "2027-01-13";
    const late = await book(d, 20);
    lapse(late);
    await book(d, 20); // takes the freed slot
    expect(await start(late)).toMatchObject({ error: expect.stringMatching(/filled up while you were checking out/) });
  });

  it("paying after the hold lapsed with the slot taken: cancelled, never overbooked, flagged for refund", async () => {
    const d = "2027-01-14";
    const late = await book(d, 20);
    const params = await start(late);
    if ("error" in params) throw new Error(params.error);
    lapse(late);
    const other = await book(d, 20); // takes the released seats

    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await settlePayment(late.userId, { ...params, method: "mock", outcome: "approve" });
    expect(r).toEqual({ status: "paid" });
    expect(err.mock.calls.some((c) => String(c[0]).includes("refund needed"))).toBe(true);
    err.mockRestore();

    expect((await getBooking(late.userId, late.id))?.status).toBe("cancelled");
    expect((await getBooking(other.userId, other.id))?.status).toBe("pending"); // the other party keeps their seats
  });

  it("a lapsed hold with the seats still free confirms normally", async () => {
    const b = await book("2027-01-15", 4);
    const params = await start(b);
    if ("error" in params) throw new Error(params.error);
    lapse(b);
    const r = await settlePayment(b.userId, { ...params, method: "mock", outcome: "approve" });
    expect(r).toEqual({ status: "paid" });
    const after = (await getBooking(b.userId, b.id))!;
    expect(after.status).toBe("confirmed");
    expect(after.holdExpiresAt).toBeNull();
  });
});

describe("isHoldLapsed", () => {
  const now = Date.parse("2026-09-26T12:00:00Z");
  it("is true only for an unpaid booking whose hold has run out", () => {
    expect(isHoldLapsed({ status: "pending", holdExpiresAt: "2026-09-26T11:59:00Z" }, now)).toBe(true);
    expect(isHoldLapsed({ status: "pending", holdExpiresAt: "2026-09-26T12:01:00Z" }, now)).toBe(false);
    expect(isHoldLapsed({ status: "pending", holdExpiresAt: null }, now)).toBe(false);
    expect(isHoldLapsed({ status: "confirmed", holdExpiresAt: "2026-09-26T11:00:00Z" }, now)).toBe(false);
    expect(isHoldLapsed({ status: "cancelled", holdExpiresAt: "2026-09-26T11:00:00Z" }, now)).toBe(false);
  });
});
