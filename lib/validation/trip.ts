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

export const refineSchema = z.object({
  instruction: z.string().trim().min(2, "Say what to change.").max(200),
});
