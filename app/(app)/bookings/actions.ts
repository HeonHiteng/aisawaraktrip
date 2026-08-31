"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getBooking, setBookingStatus } from "@/lib/domain/bookings";

export async function cancelBooking(formData: FormData): Promise<void> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  const reason = String(formData.get("reason") ?? "") || undefined;

  const b = await getBooking(user.id, bookingId);
  if (!b || !["pending", "confirmed"].includes(b.status)) return;

  await setBookingStatus(user.id, bookingId, "cancelled", reason);
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}
