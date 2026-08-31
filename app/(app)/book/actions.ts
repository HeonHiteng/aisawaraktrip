"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createBooking } from "@/lib/domain/bookings";
import { rateLimit } from "@/lib/rate-limit";
import { bookingInputSchema } from "@/lib/validation/booking";

export type BookState = { error?: string };

export async function submitBooking(
  _prev: BookState,
  formData: FormData,
): Promise<BookState> {
  const user = await requireUser();

  const rl = await rateLimit(`book:${user.id}`, 12, 60_000);
  if (!rl.ok) {
    return { error: `Too many booking attempts. Try again in ${rl.retryAfter}s.` };
  }

  const parsed = bookingInputSchema.safeParse({
    experienceId: formData.get("experienceId"),
    tripId: formData.get("tripId") || null,
    bookingDate: formData.get("bookingDate"),
    startTime: formData.get("startTime"),
    numAdults: formData.get("numAdults"),
    numChildren: formData.get("numChildren"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone") || null,
    specialRequests: formData.get("specialRequests") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const result = await createBooking(user.id, {
    ...parsed.data,
    tripId: parsed.data.tripId ?? null,
    customerPhone: parsed.data.customerPhone ?? null,
    specialRequests: parsed.data.specialRequests ?? null,
  });
  if ("error" in result) return { error: result.error };

  revalidatePath("/bookings");
  redirect(`/checkout/${result.id}`);
}
