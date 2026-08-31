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

const DAY = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export const experienceFormSchema = z
  .object({
    id: z.string().trim().optional(),
    title: z.string().trim().min(3, "Title is too short.").max(120),
    summary: z.string().trim().max(300),
    description: z.string().trim().max(2000),
    vendorId: z.string().min(1, "Pick a vendor."),
    locationId: z.string().min(1, "Pick a location."),
    durationMinutes: z.coerce.number().int().min(15).max(1440),
    pricePerPerson: z.coerce.number().min(0).max(100_000),
    minPax: z.coerce.number().int().min(1).max(50),
    maxPax: z.coerce.number().int().min(1).max(200),
    categories: z.array(CATEGORY).min(1, "Pick at least one category.").max(7),
    meetingPoint: z.string().trim().max(200),
    availabilityDays: z.array(DAY).min(1, "Pick at least one day."),
    availabilityTimes: z
      .string()
      .trim()
      .min(1, "Add at least one start time."),
    capacityPerSlot: z.coerce.number().int().min(1).max(500),
    bookingLeadtimeHours: z.coerce.number().int().min(0).max(720),
    isPublished: checkbox,
  })
  .refine((v) => v.maxPax >= v.minPax, {
    message: "Max pax must be at least min pax.",
    path: ["maxPax"],
  });
export type ExperienceForm = z.infer<typeof experienceFormSchema>;

export const vendorFormSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600),
  locationName: z.string().trim().max(120),
  contactEmail: z.union([z.email(), z.literal("")]).optional(),
  contactPhone: z.string().trim().max(40),
  verificationStatus: z.enum([
    "unverified",
    "pending",
    "verified",
    "rejected",
  ]),
  isPublished: checkbox,
});
export type VendorForm = z.infer<typeof vendorFormSchema>;

export const attractionFormSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(3).max(120),
  summary: z.string().trim().max(300),
  description: z.string().trim().max(2000),
  locationId: z.string().min(1, "Pick a location."),
  address: z.string().trim().max(200),
  avgVisitMinutes: z.coerce.number().int().min(15).max(1440),
  priceMin: z.coerce.number().min(0).max(100_000),
  priceMax: z.coerce.number().min(0).max(100_000),
  isFree: checkbox,
  categories: z.array(CATEGORY).min(1, "Pick at least one category.").max(7),
  tips: z.string().trim().max(500),
  isPublished: checkbox,
});
export type AttractionForm = z.infer<typeof attractionFormSchema>;

export const bookingStatusSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum([
    "pending",
    "confirmed",
    "cancelled",
    "completed",
    "refunded",
  ]),
});
