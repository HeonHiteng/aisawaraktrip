export interface Review {
  id: string;
  experienceId: string;
  userId: string;
  authorName: string;
  rating: number; // 1–5
  comment: string;
  createdAt: string;
}

export interface RatingSummary {
  /** Blended average of the catalogue baseline + any reviews left in-app. */
  average: number;
  count: number;
}

export function starLabel(rating: number): string {
  return `${rating} out of 5 stars`;
}
