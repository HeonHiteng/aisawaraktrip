import { describe, expect, it } from "vitest";
import {
  BOOKING_STATUS_META,
  SERVICE_FEE_RATE,
  priceBooking,
} from "@/types/booking";

describe("priceBooking", () => {
  it("computes subtotal, fee and total", () => {
    const p = priceBooking(150, 2);
    expect(p.subtotal).toBe(300);
    expect(p.serviceFee).toBe(18); // 300 * 0.06
    expect(p.totalAmount).toBe(318);
  });

  it("rounds the service fee to 2 decimals", () => {
    const p = priceBooking(199.99, 3);
    const expectedFee =
      Math.round(199.99 * 3 * SERVICE_FEE_RATE * 100) / 100;
    expect(p.serviceFee).toBe(expectedFee);
    expect(p.totalAmount).toBeCloseTo(p.subtotal + p.serviceFee, 2);
  });

  it("handles a single traveller", () => {
    expect(priceBooking(320, 1).subtotal).toBe(320);
  });

  it("handles a free experience", () => {
    const p = priceBooking(0, 4);
    expect(p.subtotal).toBe(0);
    expect(p.serviceFee).toBe(0);
    expect(p.totalAmount).toBe(0);
  });
});

describe("BOOKING_STATUS_META", () => {
  it("covers every status with a label + tone", () => {
    for (const status of [
      "pending",
      "confirmed",
      "cancelled",
      "completed",
      "refunded",
    ] as const) {
      expect(BOOKING_STATUS_META[status].label).toBeTruthy();
      expect(BOOKING_STATUS_META[status].tone).toBeTruthy();
    }
  });
});
