import { describe, expect, it } from "vitest";
import { deletionBlockers, todayInMalaysia, type DeletionBooking } from "@/lib/account-deletion";

const today = "2026-09-26";
const b = (over: Partial<DeletionBooking> & { id: string }): DeletionBooking => ({
  status: "confirmed",
  bookingDate: "2026-10-10",
  ...over,
});
const check = (bookings: DeletionBooking[], paid: string[] = [], role: "tourist" | "admin" = "tourist") =>
  deletionBlockers({ role, bookings, paidBookingIds: new Set(paid), today });

describe("account deletion blockers", () => {
  it("allows a traveller with nothing outstanding", () => {
    expect(check([])).toEqual([]);
    expect(check([b({ id: "1", status: "completed", bookingDate: "2026-08-01" })], ["1"])).toEqual([]);
    expect(check([b({ id: "2", status: "refunded" })], ["2"])).toEqual([]);
    expect(check([b({ id: "3", status: "pending" })])).toEqual([]); // an unpaid hold is just released
    expect(check([b({ id: "4", status: "cancelled" })])).toEqual([]); // cancelled before paying: nothing owed
  });

  it("blocks while a confirmed booking is still to come — today counts as upcoming", () => {
    expect(check([b({ id: "1" })])[0]).toMatch(/1 upcoming confirmed booking\./);
    expect(check([b({ id: "1", bookingDate: today })])).toHaveLength(1);
    expect(check([b({ id: "1", bookingDate: "2026-09-25" })])).toEqual([]); // yesterday: over
    expect(check([b({ id: "1" }), b({ id: "2" })])[0]).toMatch(/2 upcoming confirmed bookings/);
  });

  it("blocks while a refund is owed (cancelled but the payment is still paid)", () => {
    const msgs = check([b({ id: "1", status: "cancelled" })], ["1"]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/refund/i);
  });

  it("never lets an admin delete themselves", () => {
    expect(check([], [], "admin")[0]).toMatch(/Admin accounts/);
  });

  it("reports every reason at once", () => {
    expect(check([b({ id: "1" }), b({ id: "2", status: "cancelled" })], ["2"], "admin")).toHaveLength(3);
  });
});

describe("todayInMalaysia", () => {
  it("is UTC+8: 17:00 UTC on the 26th is already the 27th in Sarawak", () => {
    expect(todayInMalaysia(new Date("2026-09-26T17:00:00Z"))).toBe("2026-09-27");
    expect(todayInMalaysia(new Date("2026-09-26T15:59:00Z"))).toBe("2026-09-26");
  });
});
