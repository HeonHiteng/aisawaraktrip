import { z } from "zod";

const CATEGORY = z.enum([
  "nature",
  "wildlife",
  "culture",
  "heritage",
  "food",
  "adventure",
  "shopping",
]);

export const tripInputSchema = z
  .object({
    title: z.string().trim().min(1).max(80).default("My Sarawak trip"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date."),
    budgetPerPerson: z.coerce
      .number()
      .int()
      .min(0)
      .max(100_000)
      .nullable()
      .catch(null),
    groupType: z.enum(["solo", "couple", "family", "friends", "business"]),
    numAdults: z.coerce.number().int().min(1).max(20),
    numChildren: z.coerce.number().int().min(0).max(20),
    interests: z.array(CATEGORY).max(7).default([]),
    pace: z.enum(["relaxed", "moderate", "packed"]).default("moderate"),
    notes: z.string().trim().max(500).nullable().catch(null),
    prompt: z.string().trim().max(300).nullable().catch(null),
  })
  .refine((v) => new Date(v.endDate) >= new Date(v.startDate), {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  })
  .refine(
    (v) => {
      const nights =
        (new Date(v.endDate).getTime() - new Date(v.startDate).getTime()) /
        86_400_000;
      return nights <= 13;
    },
    { message: "Keep the trip to 14 days or fewer for now.", path: ["endDate"] },
  );

export type TripInputParsed = z.infer<typeof tripInputSchema>;

/** The plan page's one-line trip description, for the interpret action. */
export const promptSchema = z.string().trim().min(4).max(300);

/**
 * What the AI already read the traveller ruling out in that sentence, sent back with the plan form
 * so generating the plan doesn't read it again. It can only take places away (and the brief keeps
 * only real catalogue slugs), so a tampered value can't add anything.
 */
const promptAvoidSchema = z.object({
  categories: z.array(CATEGORY).max(7),
  slugs: z.array(z.string().max(80)).max(40),
});

export type PromptAvoid = z.infer<typeof promptAvoidSchema>;

/** The form's `promptAvoid` field, or null when it's missing or not valid JSON of that shape. */
export function parsePromptAvoid(raw: unknown): PromptAvoid | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const out = promptAvoidSchema.safeParse(JSON.parse(raw));
    return out.success ? out.data : null;
  } catch {
    return null;
  }
}

export const refineSchema = z.object({
  instruction: z.string().trim().min(2, "Say what to change.").max(200),
});
