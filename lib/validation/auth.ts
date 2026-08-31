import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your name.")
    .max(80, "That name is too long."),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer."),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const upgradeSchema = registerSchema;
export type UpgradeInput = z.infer<typeof upgradeSchema>;

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(80),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;
