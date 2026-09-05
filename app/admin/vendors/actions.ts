"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  adminDeleteVendor,
  adminSaveVendor,
  adminSetVendorVerification,
} from "@/lib/domain/admin";
import { vendorFormSchema } from "@/lib/validation/admin";
import type { VerificationStatus } from "@/types/catalogue";

export type AdminFormState = { error?: string };

export async function saveVendor(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = vendorFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    locationName: formData.get("locationName") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
    avatarUrl: formData.get("avatarUrl") || undefined,
    verificationStatus: formData.get("verificationStatus") ?? "unverified",
    isPublished: formData.get("isPublished") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  await adminSaveVendor(parsed.data);
  revalidatePath("/admin/vendors");
  revalidatePath("/explore");
  redirect("/admin/vendors");
}

export async function deleteVendor(formData: FormData): Promise<void> {
  await requireAdmin();
  await adminDeleteVendor(String(formData.get("id") ?? ""));
  revalidatePath("/admin/vendors");
  revalidatePath("/explore");
  redirect("/admin/vendors");
}

export async function setVendorVerification(formData: FormData): Promise<void> {
  await requireAdmin();
  const status = String(formData.get("status") ?? "") as VerificationStatus;
  if (!["unverified", "pending", "verified", "rejected"].includes(status)) return;
  await adminSetVendorVerification(String(formData.get("id") ?? ""), status);
  revalidatePath("/admin/vendors");
  revalidatePath("/admin");
  revalidatePath("/explore");
}
