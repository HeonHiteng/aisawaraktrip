"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminError, adminSetBookingStatus } from "@/lib/domain/admin";
import { bookingStatusSchema } from "@/lib/validation/admin";

export async function updateBookingStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = bookingStatusSchema.safeParse({
    bookingId: formData.get("bookingId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  try {
    await adminSetBookingStatus(parsed.data.bookingId, parsed.data.status);
  } catch (e) {
    if (e instanceof AdminError) {
      redirect(`/admin/bookings/${encodeURIComponent(parsed.data.bookingId)}?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }
  revalidatePath(`/admin/bookings/${parsed.data.bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}
