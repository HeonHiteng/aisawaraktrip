"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  adminDeleteAttraction,
  adminSaveAttraction,
  adminSetAttractionPublished,
} from "@/lib/domain/admin";
import { attractionFormSchema } from "@/lib/validation/admin";

export type AdminFormState = { error?: string };

export async function saveAttraction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = attractionFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name") ?? "",
    summary: formData.get("summary") ?? "",
    description: formData.get("description") ?? "",
    locationId: formData.get("locationId") ?? "",
    address: formData.get("address") ?? "",
    avgVisitMinutes: formData.get("avgVisitMinutes") ?? 90,
    priceMin: formData.get("priceMin") ?? 0,
    priceMax: formData.get("priceMax") ?? 0,
    isFree: formData.get("isFree") ?? "",
    categories: formData.getAll("categories"),
    tips: formData.get("tips") ?? "",
    isPublished: formData.get("isPublished") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  await adminSaveAttraction(parsed.data);
  revalidatePath("/admin/attractions");
  revalidatePath("/explore");
  redirect("/admin/attractions");
}

export async function deleteAttraction(formData: FormData): Promise<void> {
  await requireAdmin();
  await adminDeleteAttraction(String(formData.get("id") ?? ""));
  revalidatePath("/admin/attractions");
  revalidatePath("/explore");
}

export async function toggleAttractionPublished(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  await adminSetAttractionPublished(
    String(formData.get("id") ?? ""),
    formData.get("next") === "true",
  );
  revalidatePath("/admin/attractions");
  revalidatePath("/explore");
}
