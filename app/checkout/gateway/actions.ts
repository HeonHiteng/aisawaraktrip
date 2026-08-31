"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { settlePayment } from "@/lib/domain/payments";

export async function completeMockPayment(formData: FormData): Promise<void> {
  const user = await requireUser();

  const ref = String(formData.get("ref") ?? "");
  const outcome = String(formData.get("outcome") ?? "cancel");
  const amount = String(formData.get("amount") ?? "0");
  const method = String(formData.get("method") ?? "mock");
  const returnPath = String(formData.get("return") ?? "/bookings");

  await settlePayment(user.id, { ref, outcome, amount, method });

  const safeReturn = returnPath.startsWith("/") ? returnPath : "/bookings";
  redirect(`${safeReturn}?status=${outcome}`);
}
