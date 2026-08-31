/**
 * Central site metadata. Import this instead of hard-coding strings.
 */
function resolveUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // Vercel: stable production domain (server-side only — fine, url is used in
  // metadata / manifest / sitemap which all render on the server).
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const site = {
  name: "Sarawak Trip Planner",
  shortName: "Sarawak Trips",
  description:
    "Plan a personalized Kuching & Sarawak trip with AI — real attractions, verified local experiences, and instant booking.",
  url: resolveUrl(),
  locale: "en_MY",
  themeColor: "#6d28d9",
} as const;

export type Site = typeof site;
