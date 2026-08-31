/**
 * Central site metadata. Import this instead of hard-coding strings.
 */
export const site = {
  name: "Sarawak Trip Planner",
  shortName: "Sarawak Trips",
  description:
    "Plan a personalized Kuching & Sarawak trip with AI — real attractions, verified local experiences, and instant booking.",
  // Used for absolute URLs (Open Graph, sitemap, manifest). Overridden by env in production.
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000",
  locale: "en_MY",
  themeColor: "#6d28d9",
} as const;

export type Site = typeof site;
