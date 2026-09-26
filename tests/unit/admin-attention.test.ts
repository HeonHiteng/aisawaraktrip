import { describe, expect, it } from "vitest";
import { ATTENTION_LIST_LIMIT, computeAttention } from "@/lib/admin-attention";
import type { Booking, BookingStatus } from "@/types/booking";

const NOW = new Date("2026-09-26T12:00:00Z");
const past = "2026-09-26T11:00:00Z";
const future = "2026-09-26T13:00:00Z";

let n = 0;
const booking = (over: Partial<Booking> & { status: BookingStatus }): Booking => ({
  id: `b${++n}`,
  userId: "u",
  experienceId: "e",
  tripId: null,
  bookingDate: "2026-10-10",
  startTime: "10:00",
  numAdults: 2,
  numChildren: 0,
  customerName: "Sam",
  customerEmail: "sam@example.test",
  customerPhone: null,
  specialRequests: null,
  experienceTitle: "Longhouse Day",
  experienceSlug: "longhouse",
  vendorName: "V",
  locationName: null,
  unitPrice: 100,
  numPax: 2,
  subtotal: 200,
  serviceFee: 12,
  totalAmount: 212,
  currency: "MYR",
  createdAt: "2026-09-25T00:00:00Z",
  ...over,
});

const run = (bookings: Booking[], paid: { bookingId: string; amount: number }[] = [], vendors = 0) =>
  computeAttention({ bookings, paidPayments: paid, unverifiedVendors: vendors, now: NOW });

describe("admin needs-attention", () => {
  it("is empty when everything is fine", () => {
    const ok = [
      booking({ status: "confirmed" }),
      booking({ status: "pending", holdExpiresAt: future }),
      booking({ status: "cancelled" }), // cancelled before paying: nothing owed
    ];
    const a = run(ok, [{ bookingId: ok[0].id, amount: 212 }]);
    expect(a.total).toBe(0);
    expect(a.items).toEqual([]);
  });

  it("flags a cancelled booking whose payment is still held, with the amount", () => {
    const b = booking({ status: "cancelled", customerName: "Aisha" });
    const a = run([b], [{ bookingId: b.id, amount: 212 }]);
    expect(a.counts.refund).toBe(1);
    expect(a.items[0]).toMatchObject({ kind: "refund", severity: "high", href: `/admin/bookings/${b.id}` });
    expect(a.items[0].title).toContain("Aisha");
    expect(a.items[0].title).toContain("212");
  });

  it("stops flagging once the booking is marked refunded", () => {
    const b = booking({ status: "refunded" });
    expect(run([b], [{ bookingId: b.id, amount: 212 }]).total).toBe(0);
  });

  it("flags unpaid bookings only after the hold has lapsed", () => {
    const lapsed = booking({ status: "pending", holdExpiresAt: past });
    const live = booking({ status: "pending", holdExpiresAt: future });
    const legacy = booking({ status: "pending", holdExpiresAt: null });
    const a = run([lapsed, live, legacy]);
    expect(a.items.map((i) => i.href)).toEqual([`/admin/bookings/${lapsed.id}`]);
    expect(a.items[0]).toMatchObject({ kind: "unpaid", severity: "low" });
  });

  it("lists refunds before unpaid before vendors", () => {
    const unpaid = booking({ status: "pending", holdExpiresAt: past });
    const refund = booking({ status: "cancelled" });
    const a = run([unpaid, refund], [{ bookingId: refund.id, amount: 5 }], 2);
    expect(a.items.map((i) => i.kind)).toEqual(["refund", "unpaid", "vendor"]);
    expect(a.items[2].title).toBe("2 vendors awaiting verification");
    expect(a.total).toBe(4);
  });

  it("singular vendor wording", () => {
    expect(run([], [], 1).items[0].title).toBe("1 vendor awaiting verification");
  });

  it("caps each list but still reports the real counts", () => {
    const many = Array.from({ length: ATTENTION_LIST_LIMIT + 5 }, () => booking({ status: "cancelled" }));
    const a = run(many, many.map((b) => ({ bookingId: b.id, amount: 1 })));
    expect(a.items).toHaveLength(ATTENTION_LIST_LIMIT);
    expect(a.counts.refund).toBe(ATTENTION_LIST_LIMIT + 5);
    expect(a.total).toBe(ATTENTION_LIST_LIMIT + 5);
  });

  it("puts the longest-waiting refund first", () => {
    const newer = booking({ status: "cancelled", createdAt: "2026-09-25T10:00:00Z" });
    const older = booking({ status: "cancelled", createdAt: "2026-09-20T10:00:00Z" });
    const a = run([newer, older], [newer, older].map((b) => ({ bookingId: b.id, amount: 1 })));
    expect(a.items[0].href).toBe(`/admin/bookings/${older.id}`);
  });

  it("adds up several paid payments on one booking", () => {
    const b = booking({ status: "cancelled" });
    const a = run([b], [{ bookingId: b.id, amount: 100 }, { bookingId: b.id, amount: 112 }]);
    expect(a.items[0].title).toContain("212");
  });
});
