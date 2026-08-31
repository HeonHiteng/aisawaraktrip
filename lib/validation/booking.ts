import { z } from "zod";

export const bookingInputSchema = z.object({
  experienceId: z.string().min(1),
  tripId: z.string().min(1).nullable().catch(null),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time."),
  numAdults: z.coerce.number().int().min(1).max(20),
  numChildren: z.coerce.number().int().min(0).max(20),
  customerName: z.string().trim().min(2, "Enter a name.").max(80),
  customerEmail: z.email("Enter a valid email."),
  customerPhone: z.string().trim().max(30).nullable().catch(null),
  specialRequests: z.string().trim().max(500).nullable().catch(null),
});

export type BookingInputParsed = z.infer<typeof bookingInputSchema>;

export const cancelSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().trim().max(200).nullable().catch(null),
});
