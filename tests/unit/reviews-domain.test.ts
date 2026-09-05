import { describe, expect, it } from "vitest";
import {
  addReview,
  canReview,
  listReviews,
  ratingSummary,
} from "@/lib/domain/reviews";
import { createBooking, setBookingStatus } from "@/lib/domain/bookings";
import { getExperienceById } from "@/lib/domain/catalogue";
import { weekdayKey } from "@/lib/format";

let seq = 0;
const nextUser = () => `reviews-domain-user-${Date.now()}-${seq++}`;

async function bookAndConfirm(userId: string, experienceId: string) {
  const exp = await getExperienceById(experienceId);
  if (!exp) throw new Error(`no fixture: ${experienceId}`);
  // first date >= 30 days out that lands on a weekday the experience runs
  let date = "";
  for (let i = 30; i < 44; i++) {
    const d = new Date("2026-12-01T00:00:00Z");
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (
      !exp.availability.days.length ||
      exp.availability.days.includes(weekdayKey(iso))
    ) {
      date = iso;
      break;
    }
  }
  const b = await createBooking(userId, {
    experienceId,
    tripId: null,
    bookingDate: date,
    startTime: exp.availability.times[0] ?? "09:00",
    numAdults: Math.max(2, exp.minPax),
    numChildren: 0,
    customerName: "Test",
    customerEmail: "test@example.com",
    customerPhone: null,
    specialRequests: null,
  });
  if ("error" in b) throw new Error(b.error);
  await setBookingStatus(userId, b.id, "confirmed");
}

describe("ratingSummary", () => {
  it("blends the catalogue baseline with in-app reviews", async () => {
    // exp-cruise ships as 4.7 over 96 reviews + one seeded 5-star review
    const s = await ratingSummary("exp-cruise");
    expect(s.count).toBeGreaterThanOrEqual(97);
    expect(s.average).toBeGreaterThan(4.6);
    expect(s.average).toBeLessThanOrEqual(4.75);
  });

  it("is { 0, 0 } for an experience with no rating and no reviews", async () => {
    const s = await ratingSummary("exp-does-not-exist");
    expect(s).toEqual({ average: 0, count: 0 });
  });
});

describe("canReview", () => {
  it("is blocked without a confirmed/completed booking", async () => {
    const userId = nextUser();
    const gate = await canReview(userId, "exp-cruise");
    expect(gate.ok).toBe(false);
  });

  it("opens once a booking for that experience is confirmed, then closes after one review", async () => {
    const userId = nextUser();
    await bookAndConfirm(userId, "exp-cruise");

    expect((await canReview(userId, "exp-cruise")).ok).toBe(true);
    // ...but not for a different experience they didn't book
    expect((await canReview(userId, "exp-bako")).ok).toBe(false);

    const created = await addReview(userId, "Test Traveller", {
      experienceId: "exp-cruise",
      rating: 5,
      comment: "A wonderful evening on the estuary.",
    });
    expect("error" in created).toBe(false);

    // one review per user per experience
    expect((await canReview(userId, "exp-cruise")).ok).toBe(false);
    const dupe = await addReview(userId, "Test Traveller", {
      experienceId: "exp-cruise",
      rating: 3,
      comment: "Trying to review again.",
    });
    expect("error" in dupe).toBe(true);
  });
});

describe("addReview", () => {
  it("rejects a review from a user with no booking", async () => {
    const userId = nextUser();
    const result = await addReview(userId, "Nobody", {
      experienceId: "exp-foodwalk",
      rating: 5,
      comment: "Never actually did this.",
    });
    expect("error" in result).toBe(true);
    expect(await listReviews("exp-foodwalk")).not.toContainEqual(
      expect.objectContaining({ userId }),
    );
  });

  it("appends a valid review and it shows up newest-first", async () => {
    const userId = nextUser();
    await bookAndConfirm(userId, "exp-kayak");
    const before = (await listReviews("exp-kayak")).length;

    const created = await addReview(userId, "River Fan", {
      experienceId: "exp-kayak",
      rating: 4,
      comment: "Beginner-friendly and the village lunch was great.",
    });
    if ("error" in created) throw new Error(created.error);

    const after = await listReviews("exp-kayak");
    expect(after.length).toBe(before + 1);
    expect(after[0].id).toBe(created.id);
    expect(after[0].authorName).toBe("River Fan");
  });
});
