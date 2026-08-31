"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { adminSetBookingStatus } from "@/lib/domain/admin";
import { bookingStatusSchema } from "@/lib/validation/admin";

export async function updateBookingStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = bookingStatusSchema.safeParse({
    bookingId: formData.get("bookingId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  await adminSetBookingStatus(parsed.data.bookingId, parsed.data.status);
  revalidatePath(`/admin/bookings/${parsed.data.bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}
