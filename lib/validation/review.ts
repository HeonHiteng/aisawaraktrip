import { z } from "zod";

export const reviewInputSchema = z.object({
  experienceId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Pick a rating.").max(5),
  comment: z
    .string()
    .trim()
    .min(10, "Tell other travellers a bit more (at least 10 characters).")
    .max(600, "Keep it under 600 characters."),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;
