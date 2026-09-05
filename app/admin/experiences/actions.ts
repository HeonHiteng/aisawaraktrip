"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  adminDeleteExperience,
  adminSaveExperience,
  adminSetExperiencePublished,
} from "@/lib/domain/admin";
import { experienceFormSchema } from "@/lib/validation/admin";

export type AdminFormState = { error?: string };

export async function saveExperience(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = experienceFormSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title") ?? "",
    summary: formData.get("summary") ?? "",
    description: formData.get("description") ?? "",
    vendorId: formData.get("vendorId") ?? "",
    locationId: formData.get("locationId") ?? "",
    durationMinutes: formData.get("durationMinutes") ?? 0,
    pricePerPerson: formData.get("pricePerPerson") ?? 0,
    minPax: formData.get("minPax") ?? 1,
    maxPax: formData.get("maxPax") ?? 1,
    categories: formData.getAll("categories"),
    meetingPoint: formData.get("meetingPoint") ?? "",
    availabilityDays: formData.getAll("availabilityDays"),
    availabilityTimes: formData.get("availabilityTimes") ?? "",
    capacityPerSlot: formData.get("capacityPerSlot") ?? 1,
    bookingLeadtimeHours: formData.get("bookingLeadtimeHours") ?? 0,
    languages: formData.get("languages") ?? "",
    includes: formData.get("includes") ?? "",
    cancellationPolicy: formData.get("cancellationPolicy") ?? "",
    images: formData.get("images") ?? "",
    isPublished: formData.get("isPublished") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  await adminSaveExperience(parsed.data);
  revalidatePath("/admin/experiences");
  revalidatePath("/explore");
  redirect("/admin/experiences");
}

export async function deleteExperience(formData: FormData): Promise<void> {
  await requireAdmin();
  await adminDeleteExperience(String(formData.get("id") ?? ""));
  revalidatePath("/admin/experiences");
  revalidatePath("/explore");
}

export async function toggleExperiencePublished(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  await adminSetExperiencePublished(
    String(formData.get("id") ?? ""),
    formData.get("next") === "true",
  );
  revalidatePath("/admin/experiences");
  revalidatePath("/explore");
}
