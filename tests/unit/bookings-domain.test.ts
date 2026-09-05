import { describe, expect, it } from "vitest";
import {
  createBooking,
  getBooking,
  listBookings,
  setBookingStatus,
} from "@/lib/domain/bookings";
import type { BookingInput } from "@/types/booking";

let seq = 0;
const nextUser = () => `bookings-domain-user-${Date.now()}-${seq++}`;

function input(overrides: Partial<BookingInput> = {}): BookingInput {
  return {
    experienceId: "exp-cruise", // Santubong cruise: daily, 15:30, min 2 / max 20 pax
    tripId: null,
    bookingDate: "2026-12-15", // a Tuesday — cruise runs every day
    startTime: "15:30",
    numAdults: 2,
    numChildren: 0,
    customerName: "Test Traveller",
    customerEmail: "test@example.com",
    customerPhone: null,
    specialRequests: null,
    ...overrides,
  };
}

describe("createBooking", () => {
  it("snapshots the price server-side from the catalogue, not the client", async () => {
    const userId = nextUser();
    const result = await createBooking(userId, input());
    if ("error" in result) throw new Error(result.error);
    // exp-cruise is RM180/pp; 2 pax => 360 subtotal + 6% service fee
    expect(result.unitPrice).toBe(180);
    expect(result.subtotal).toBe(360);
    expect(result.serviceFee).toBeCloseTo(21.6, 5);
    expect(result.totalAmount).toBeCloseTo(381.6, 5);
    expect(result.status).toBe("pending");
  });

  it("rejects a party smaller than minPax or larger than maxPax", async () => {
    const userId = nextUser();
    const tooFew = await createBooking(
      userId,
      input({ numAdults: 1, numChildren: 0 }), // cruise minPax is 2
    );
    expect("error" in tooFew).toBe(true);

    const tooMany = await createBooking(
      userId,
      input({ numAdults: 21, numChildren: 0 }), // cruise maxPax is 20
    );
    expect("error" in tooMany).toBe(true);
  });

  it("rejects a booking date on a weekday the experience doesn't run", async () => {
    const userId = nextUser();
    // exp-cooking runs mon/wed/fri/sat only
    const result = await createBooking(
      userId,
      input({ experienceId: "exp-cooking", bookingDate: "2026-12-15" }), // a Tuesday
    );
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.toLowerCase()).toContain("run");
  });

  it("rejects a start time that isn't one of the listed slots", async () => {
    const userId = nextUser();
    const result = await createBooking(
      userId,
      input({ startTime: "10:00" }), // cruise only runs 15:30
    );
    expect("error" in result).toBe(true);
  });

  it("rejects an unknown experience id", async () => {
    const userId = nextUser();
    const result = await createBooking(
      userId,
      input({ experienceId: "exp-does-not-exist" }),
    );
    expect("error" in result).toBe(true);
  });

  it("isolates bookings per user", async () => {
    const userA = nextUser();
    const userB = nextUser();
    const booking = await createBooking(userA, input());
    if ("error" in booking) throw new Error(booking.error);

    expect(await getBooking(userA, booking.id)).not.toBeNull();
    expect(await getBooking(userB, booking.id)).toBeNull();

    const listA = await listBookings(userA);
    const listB = await listBookings(userB);
    expect(listA.some((b) => b.id === booking.id)).toBe(true);
    expect(listB.some((b) => b.id === booking.id)).toBe(false);
  });
});

describe("setBookingStatus", () => {
  it("updates the booking's status in place", async () => {
    const userId = nextUser();
    const booking = await createBooking(userId, input());
    if ("error" in booking) throw new Error(booking.error);

    await setBookingStatus(userId, booking.id, "confirmed");
    expect((await getBooking(userId, booking.id))?.status).toBe("confirmed");

    await setBookingStatus(userId, booking.id, "cancelled", "changed my mind");
    const after = await getBooking(userId, booking.id);
    expect(after?.status).toBe("cancelled");
    expect(after?.specialRequests).toBe("changed my mind");
  });

  it("is a no-op for a booking id that doesn't exist", async () => {
    const userId = nextUser();
    await expect(
      setBookingStatus(userId, "nonexistent-id", "confirmed"),
    ).resolves.toBeUndefined();
  });
});
