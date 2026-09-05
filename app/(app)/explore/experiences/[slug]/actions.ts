"use server";

import { revalidatePath } from "next/cache";
import { getProfile, requireUser } from "@/lib/auth";
import { addReview } from "@/lib/domain/reviews";
import { rateLimit } from "@/lib/rate-limit";
import { reviewInputSchema } from "@/lib/validation/review";

export type ReviewState = { error?: string; ok?: boolean };

export async function submitReview(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const user = await requireUser();

  const rl = await rateLimit(`review:${user.id}`, 5, 60_000);
  if (!rl.ok) {
    return { error: `Slow down — try again in ${rl.retryAfter}s.` };
  }

  const parsed = reviewInputSchema.safeParse({
    experienceId: formData.get("experienceId"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your review." };
  }

  const profile = await getProfile();
  const result = await addReview(
    user.id,
    profile?.full_name ?? "A traveller",
    parsed.data,
  );
  if ("error" in result) return { error: result.error };

  const slug = String(formData.get("slug") ?? "");
  if (slug) revalidatePath(`/explore/experiences/${slug}`);
  revalidatePath("/explore");
  return { ok: true };
}
