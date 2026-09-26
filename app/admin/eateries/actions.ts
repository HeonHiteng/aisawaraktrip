"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  AdminError,
  adminDeleteEatery,
  adminSaveEatery,
  adminSetEateryPublished,
} from "@/lib/domain/admin";
import { eateryFormSchema } from "@/lib/validation/admin";

export type AdminFormState = { error?: string };

export async function saveEatery(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = eateryFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name") ?? "",
    city: formData.get("city") ?? "",
    dishes: formData.getAll("dishes"),
    priceTier: formData.get("priceTier") ?? "",
    isSplurge: formData.get("isSplurge") ?? "",
    mapsUrl: formData.get("mapsUrl") ?? "",
    notes: formData.get("notes") ?? "",
    isPublished: formData.get("isPublished") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  try {
    await adminSaveEatery(parsed.data);
  } catch (e) {
    if (e instanceof AdminError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/eateries");
  revalidatePath("/explore");
  redirect("/admin/eateries");
}

export async function deleteEatery(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    await adminDeleteEatery(id);
  } catch (e) {
    if (e instanceof AdminError) {
      redirect(`/admin/eateries/${encodeURIComponent(id)}/edit?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }
  revalidatePath("/admin/eateries");
  revalidatePath("/explore");
  redirect("/admin/eateries");
}

export async function toggleEateryPublished(formData: FormData): Promise<void> {
  await requireAdmin();
  await adminSetEateryPublished(
    String(formData.get("id") ?? ""),
    formData.get("next") === "true",
  );
  revalidatePath("/admin/eateries");
  revalidatePath("/explore");
}
