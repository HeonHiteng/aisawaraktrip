import { describe, expect, it } from "vitest";
import {
  bookingFromRow,
  bookingToInsert,
  parseSettleOutcome,
  paymentFromRow,
} from "@/lib/domain/mappers/bookings";
import type { Tables } from "@/types/database";
import type { BookingInput } from "@/types/booking";
import { priceBooking } from "@/types/booking";

const input: BookingInput = {
  experienceId: "44444444-0000-0000-0000-000000000001",
  tripId: null,
  bookingDate: "2026-12-02",
  startTime: "17:30",
  numAdults: 2,
  numChildren: 1,
  customerName: "Alice",
  customerEmail: "alice@example.test",
  customerPhone: null,
  specialRequests: "vegetarian",
};

const snapshot = (unit: number, pax: number) => {
  const p = priceBooking(unit, pax);
  return {
    experienceTitle: "Food walk",
    experienceSlug: "food-walk",
    vendorName: "KFW",
    locationName: "Kuching",
    unitPrice: unit,
    ...p,
    currency: "MYR",
  };
};

describe("bookingToInsert", () => {
  it("writes identity from the session and money from the catalogue snapshot — nothing else", () => {
    const row = bookingToInsert("user-1", input, snapshot(150, 3));
    expect(row).toMatchObject({
      user_id: "user-1",
      status: "pending",
      unit_price: 150,
      subtotal: 450,
      service_fee: 27,
      total_amount: 477,
      experience_title: "Food walk",
      vendor_name: "KFW",
      start_time: "17:30",
    });
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("num_pax"); // generated column
  });

  it("always satisfies the database's own money rules, whatever floats do", () => {
    // 0.1-style drift must be rounded away before it reaches bookings_amounts_consistent
    for (const [unit, pax] of [[150, 2], [199.99, 3], [33.33, 7], [0.1, 3], [0, 2], [1234.56, 9]] as const) {
      const r = bookingToInsert("u", { ...input, numAdults: pax, numChildren: 0 }, snapshot(unit, pax));
      const cents = (n: number | undefined) => Math.round((n ?? 0) * 100);
      expect(cents(r.subtotal)).toBe(cents(r.unit_price) * pax);
      expect(cents(r.total_amount)).toBe(cents(r.subtotal) + cents(r.service_fee));
    }
  });
});

const dbRow = (over: Partial<Tables<"bookings">> = {}): Tables<"bookings"> => ({
  id: "b1",
  user_id: "u1",
  experience_id: "e1",
  trip_id: "t1",
  itinerary_item_id: null,
  booking_date: "2026-12-02",
  start_time: "17:30:00",
  num_adults: 2,
  num_children: 1,
  num_pax: 3,
  unit_price: "150.00" as never,
  subtotal: "450.00" as never,
  service_fee: 27,
  total_amount: 477,
  currency: "MYR",
  status: "confirmed",
  customer_name: "Alice",
  customer_email: "a@a.test",
  customer_phone: null,
  special_requests: null,
  cancellation_reason: null,
  experience_title: "Food walk",
  experience_slug: "food-walk",
  vendor_name: "KFW",
  location_name: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("bookingFromRow", () => {
  it("maps to the domain booking: trimmed time, numeric money, snapshot fields", () => {
    expect(bookingFromRow(dbRow())).toMatchObject({
      id: "b1",
      userId: "u1",
      tripId: "t1",
      startTime: "17:30",
      numPax: 3,
      unitPrice: 150,
      subtotal: 450,
      serviceFee: 27,
      totalAmount: 477,
      experienceTitle: "Food walk",
      vendorName: "KFW",
      locationName: null,
      status: "confirmed",
    });
  });

  it("tolerates a missing start time and a null generated pax", () => {
    const b = bookingFromRow(dbRow({ start_time: null, num_pax: null }));
    expect(b.startTime).toBe("");
    expect(b.numPax).toBe(3);
  });
});

describe("paymentFromRow", () => {
  it("maps a payment row", () => {
    const p = paymentFromRow({
      id: "p1",
      booking_id: "b1",
      provider: "mock",
      provider_ref: null,
      provider_payment_id: null,
      amount: "318.00" as never,
      currency: "MYR",
      method: "mock",
      status: "created",
      raw_payload: {},
      paid_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    expect(p).toMatchObject({ bookingId: "b1", amount: 318, providerRef: "", status: "created", paidAt: null });
  });
});

describe("parseSettleOutcome", () => {
  it("reads the SQL function's JSON", () => {
    expect(parseSettleOutcome({ result: "paid", confirmed_now: true, booking_id: "b", user_id: "u", booking_status: "confirmed" })).toEqual({
      result: "paid", confirmedNow: true, bookingId: "b", userId: "u", bookingStatus: "confirmed",
    });
  });

  it("never trusts the shape: junk becomes 'unknown' and never claims a confirmation", () => {
    for (const junk of [null, undefined, 5, "paid", [], {}, { result: 7 }, { result: "hacked", confirmed_now: "yes" }]) {
      const o = parseSettleOutcome(junk);
      expect(o.result).toBe("unknown");
      expect(o.confirmedNow).toBe(false);
    }
  });
});
