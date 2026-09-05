import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { reviewsStore } from "@/lib/demo/reviews-store";
import { getExperienceById } from "@/lib/domain/catalogue";
import { listBookings } from "@/lib/domain/bookings";
import type { ReviewInput } from "@/lib/validation/review";
import type { RatingSummary, Review } from "@/types/review";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export async function listReviews(experienceId: string): Promise<Review[]> {
  if (DEMO_MODE) {
    return reviewsStore()
      .filter((r) => r.experienceId === experienceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return []; // TODO: supabase select from reviews
}

/**
 * Blends the catalogue's baseline rating (treated as N historical reviews) with
 * anything left in-app, so the number a traveller sees always reflects both.
 */
export async function ratingSummary(
  experienceId: string,
): Promise<RatingSummary> {
  const [exp, live] = await Promise.all([
    getExperienceById(experienceId),
    listReviews(experienceId),
  ]);
  const baseAvg = exp?.rating ?? 0;
  const baseCount = exp?.reviewCount ?? 0;
  const liveSum = live.reduce((s, r) => s + r.rating, 0);
  const count = baseCount + live.length;
  if (count === 0) return { average: 0, count: 0 };
  const average = (baseAvg * baseCount + liveSum) / count;
  return { average: Math.round(average * 10) / 10, count };
}

/**
 * A traveller can review an experience once, and only after a booking for it
 * has been confirmed or completed — keeps reviews tied to real trips.
 */
export async function canReview(
  userId: string,
  experienceId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const bookings = await listBookings(userId);
  const eligible = bookings.some(
    (b) =>
      b.experienceId === experienceId &&
      (b.status === "confirmed" || b.status === "completed"),
  );
  if (!eligible) {
    return {
      ok: false,
      reason: "You can review this once your booking for it is confirmed.",
    };
  }
  const existing = await listReviews(experienceId);
  if (existing.some((r) => r.userId === userId)) {
    return { ok: false, reason: "You've already reviewed this experience." };
  }
  return { ok: true };
}

export async function addReview(
  userId: string,
  authorName: string,
  input: ReviewInput,
): Promise<Review | { error: string }> {
  const gate = await canReview(userId, input.experienceId);
  if (!gate.ok) return { error: gate.reason };

  const review: Review = {
    id: uid(),
    experienceId: input.experienceId,
    userId,
    authorName: authorName.trim() || "A traveller",
    rating: input.rating,
    comment: input.comment,
    createdAt: new Date().toISOString(),
  };
  if (DEMO_MODE) reviewsStore().push(review);
  // TODO: insert into supabase reviews (RLS: author only)
  return review;
}
