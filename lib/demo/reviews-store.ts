import "server-only";
import type { Review } from "@/types/review";

/**
 * Reviews are public content shared across every viewer (like the catalogue
 * store), so this is a single global list, not a per-user store. Resets on
 * server restart. A handful are seeded so the section isn't empty on a fresh
 * server.
 */
const g = globalThis as unknown as {
  __demoReviews?: Review[];
  __demoReviewsSeeded?: boolean;
};

g.__demoReviews ??= [];

const SEED: Omit<Review, "id" | "createdAt">[] = [
  {
    experienceId: "exp-foodwalk",
    userId: "seed-reviewer-1",
    authorName: "Priya N.",
    rating: 5,
    comment:
      "Our guide knew every stall owner by name. The kek lapis stop alone was worth it — go hungry.",
  },
  {
    experienceId: "exp-foodwalk",
    userId: "seed-reviewer-2",
    authorName: "James F.",
    rating: 4,
    comment:
      "Great intro to Kuching food. A little rushed at the end but we tried everything on the list.",
  },
  {
    experienceId: "exp-cruise",
    userId: "seed-reviewer-3",
    authorName: "Mei Ling C.",
    rating: 5,
    comment:
      "Saw the Irrawaddy dolphins and a whole troop of proboscis monkeys. The fireflies on the way back were magical.",
  },
  {
    experienceId: "exp-annahrais",
    userId: "seed-reviewer-4",
    authorName: "Lukas W.",
    rating: 5,
    comment:
      "Spent the day with a Bidayuh family — bamboo cooking, the headhouse, a walk to the waterfall. Respectful and completely unforgettable.",
  },
  {
    experienceId: "exp-bako",
    userId: "seed-reviewer-5",
    authorName: "Aisyah R.",
    rating: 4,
    comment:
      "Long day and the trails are humid, but the naturalist matched the pace to us and the proboscis monkeys did not disappoint.",
  },
];

if (!g.__demoReviewsSeeded) {
  g.__demoReviewsSeeded = true;
  const base = Date.now() - 40 * 86_400_000;
  g.__demoReviews.push(
    ...SEED.map((r, i) => ({
      ...r,
      id: `seed-review-${i}`,
      createdAt: new Date(base + i * 5 * 86_400_000).toISOString(),
    })),
  );
}

export function reviewsStore(): Review[] {
  return g.__demoReviews!;
}
