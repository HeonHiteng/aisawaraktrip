import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { reviewsStore } from "@/lib/demo/reviews-store";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/domain/mappers/catalogue";
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
  if (!isUuid(experienceId)) return [];
  const { data, error } = await createPublicClient()
    .from("reviews")
    .select("id, experience_id, user_id, author_name, rating, comment, created_at")
    .eq("experience_id", experienceId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`reviews: ${error.message}`);
  return data.map((r) => ({
    id: r.id,
    experienceId: r.experience_id,
    userId: r.user_id,
    authorName: r.author_name,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  }));
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

  const name = authorName.trim() || "A traveller";

  if (DEMO_MODE) {
    const review: Review = {
      id: uid(),
      experienceId: input.experienceId,
      userId,
      authorName: name,
      rating: input.rating,
      comment: input.comment,
      createdAt: new Date().toISOString(),
    };
    reviewsStore().push(review);
    return review;
  }

  // Written with the service role (clients have no write privilege on `reviews`);
  // identity comes from the session. The database re-checks the booking gate and
  // uniqueness, so two racing submissions can't both land.
  const { data, error } = await createAdminClient()
    .from("reviews")
    .insert({
      experience_id: input.experienceId,
      user_id: userId,
      author_name: name,
      rating: input.rating,
      comment: input.comment,
    })
    .select("id, experience_id, user_id, author_name, rating, comment, created_at")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "You've already reviewed this experience." };
    if (error.code === "P0001") return { error: "You can review this once your booking for it is confirmed." };
    throw new Error(`add review: ${error.message}`);
  }
  return {
    id: data.id,
    experienceId: data.experience_id,
    userId: data.user_id,
    authorName: data.author_name,
    rating: data.rating,
    comment: data.comment,
    createdAt: data.created_at,
  };
}
