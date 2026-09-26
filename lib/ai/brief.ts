import * as z from "zod";
import type { CategorySlug } from "@/types/catalogue";
import type { Candidates } from "@/lib/ai/itinerary";

/**
 * The AI planner's "brief".
 *
 * Claude never writes an itinerary. It reads the traveller's request and the list of real
 * catalogue records, and returns a small structured brief: what to leave out, what to rank
 * first, and a one-line personal reason per pick. The deterministic builder
 * (lib/ai/itinerary.ts) then does all the scheduling and every price, from the database.
 *
 * So nothing here can introduce a place, a price or a time that isn't in the catalogue: slugs
 * are constrained by a schema enum AND re-checked by `sanitizeBrief`, and free text is only
 * ever the short "why" line.
 */

const CATEGORIES = ["nature", "wildlife", "culture", "heritage", "food", "adventure", "shopping"] as const;

export const MAX_REASON_CHARS = 160;
export const MAX_PREFER = 8;

export interface Brief {
  avoidSlugs: string[];
  avoidCategories: CategorySlug[];
  /** Best first. */
  preferSlugs: string[];
  /** slug -> one short sentence, addressed to the traveller. */
  reasons: Record<string, string>;
}

export const EMPTY_BRIEF: Brief = { avoidSlugs: [], avoidCategories: [], preferSlugs: [], reasons: {} };

/** Every slug the model may name: the catalogue's own. */
export function catalogueSlugs(c: Pick<Candidates, "experiences" | "attractions">): string[] {
  return [...c.experiences.map((e) => e.slug), ...c.attractions.map((a) => a.slug)];
}

/** The schema Claude must answer in — slugs are an enum of what really exists. */
export function briefSchema(slugs: string[]) {
  if (slugs.length === 0) throw new Error("no catalogue slugs to constrain the brief to");
  const slug = z.enum(slugs as [string, ...string[]]);
  return z.object({
    avoidSlugs: z.array(slug).describe("Places the traveller clearly does not want (e.g. they said 'skip the museum').").max(10),
    avoidCategories: z.array(z.enum(CATEGORIES)).describe("Whole categories they don't want, e.g. 'no shopping'.").max(7),
    preferSlugs: z.array(slug).describe("The best fits for this traveller, best first.").max(MAX_PREFER),
    reasons: z
      .array(z.object({ slug, reason: z.string().describe(`One friendly sentence (max ${MAX_REASON_CHARS} chars) on why this suits them.`) }))
      .max(MAX_PREFER + 4),
  });
}

/** Plain text, one line, bounded. Never HTML (React escapes anyway) or control characters. */
export function cleanReason(s: string): string {
  const oneLine = s.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim();
  return oneLine.length <= MAX_REASON_CHARS ? oneLine : oneLine.slice(0, MAX_REASON_CHARS - 1).trimEnd() + "…";
}

/**
 * Trust nothing: keep only slugs/categories that exist, dedupe, bound lengths. A place that is
 * both avoided and preferred is avoided — a veto always wins.
 */
export function sanitizeBrief(raw: unknown, allowed: ReadonlySet<string>): Brief {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const uniq = <T>(xs: T[]) => [...new Set(xs)];

  const avoidSlugs = uniq(strings(r.avoidSlugs).filter((s) => allowed.has(s)));
  const avoidCategories = uniq(strings(r.avoidCategories).filter((c): c is CategorySlug => (CATEGORIES as readonly string[]).includes(c)));
  const avoided = new Set(avoidSlugs);
  const preferSlugs = uniq(strings(r.preferSlugs).filter((s) => allowed.has(s) && !avoided.has(s))).slice(0, MAX_PREFER);

  const reasons: Record<string, string> = {};
  if (Array.isArray(r.reasons)) {
    for (const item of r.reasons) {
      const slug = (item as { slug?: unknown })?.slug;
      const reason = (item as { reason?: unknown })?.reason;
      if (typeof slug !== "string" || typeof reason !== "string") continue;
      if (!allowed.has(slug) || avoided.has(slug) || reasons[slug]) continue;
      const clean = cleanReason(reason);
      if (clean.length >= 8) reasons[slug] = clean;
    }
  }
  return { avoidSlugs, avoidCategories, preferSlugs, reasons };
}

/**
 * Fold a brief into the candidate lists the builder will use. Vetoes remove records up front;
 * but a brief can never empty the catalogue — if it would, the vetoes are ignored.
 */
export function applyBrief(c: Candidates, brief: Brief): Candidates {
  const dropSlug = new Set(brief.avoidSlugs);
  const dropCat = new Set<string>(brief.avoidCategories);
  const keep = <T extends { slug: string; categories: CategorySlug[] }>(xs: T[]) =>
    xs.filter((x) => !dropSlug.has(x.slug) && !x.categories.some((cat) => dropCat.has(cat)));

  const experiences = keep(c.experiences);
  const attractions = keep(c.attractions);
  const usable = experiences.length + attractions.length > 0;
  return {
    ...c, // keeps anything else the caller passed (the food guide)
    experiences: usable ? experiences : c.experiences,
    attractions: usable ? attractions : c.attractions,
    prefer: brief.preferSlugs,
    reasons: brief.reasons,
  };
}
