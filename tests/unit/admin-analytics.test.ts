import { describe, expect, it } from "vitest";
import { adminAnalytics } from "@/lib/domain/admin";
import { buildSeedHistory } from "@/lib/demo/seed-bookings";

describe("buildSeedHistory", () => {
  it("produces 11 weeks of history with payments only for settled bookings", () => {
    const { bookings, payments } = buildSeedHistory(new Date("2026-08-31"));
    expect(bookings.length).toBeGreaterThan(20);

    const settledIds = new Set(
      bookings
        .filter((b) => b.status === "confirmed" || b.status === "completed")
        .map((b) => b.id),
    );
    const refundedIds = new Set(
      bookings.filter((b) => b.status === "refunded").map((b) => b.id),
    );
    for (const p of payments) {
      expect(settledIds.has(p.bookingId) || refundedIds.has(p.bookingId)).toBe(
        true,
      );
    }
    // no payment for a pending/cancelled booking
    const pendingIds = new Set(
      bookings.filter((b) => b.status === "pending").map((b) => b.id),
    );
    expect(payments.some((p) => pendingIds.has(p.bookingId))).toBe(false);
  });

  it("is deterministic", () => {
    const a = buildSeedHistory(new Date("2026-08-31"));
    const b = buildSeedHistory(new Date("2026-08-31"));
    expect(a.bookings.length).toBe(b.bookings.length);
    expect(a.bookings[0].id).toBe(b.bookings[0].id);
  });
});

describe("adminAnalytics", () => {
  it("returns a well-formed shape backed by the seeded store", async () => {
    const a = await adminAnalytics();

    expect(a.weekly).toHaveLength(10);
    expect(a.byStatus).toHaveLength(5);
    expect(a.topExperiences.length).toBeGreaterThan(0);

    // weekly counts never exceed the all-time total
    const weeklyBookings = a.weekly.reduce((s, w) => s + w.bookings, 0);
    expect(weeklyBookings).toBeLessThanOrEqual(a.kpis.bookings);

    // status counts sum to the all-time total
    const statusTotal = a.byStatus.reduce((s, x) => s + x.count, 0);
    expect(statusTotal).toBe(a.kpis.bookings);

    // top experiences sorted by revenue, descending
    for (let i = 1; i < a.topExperiences.length; i++) {
      expect(a.topExperiences[i - 1].revenue).toBeGreaterThanOrEqual(
        a.topExperiences[i].revenue,
      );
    }

    expect(a.kpis.confirmedRate).toBeGreaterThanOrEqual(0);
    expect(a.kpis.confirmedRate).toBeLessThanOrEqual(1);
    expect(a.kpis.revenue).toBeGreaterThan(0);
  });
});
