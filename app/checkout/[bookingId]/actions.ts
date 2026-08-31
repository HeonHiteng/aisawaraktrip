"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { startPayment } from "@/lib/domain/payments";
import type { PaymentMethod } from "@/types/payment";

export type CheckoutState = { error?: string };

const METHODS: PaymentMethod[] = ["fpx", "card", "ewallet"];

export async function pay(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  const method = String(formData.get("method") ?? "fpx") as PaymentMethod;
  if (!METHODS.includes(method)) return { error: "Choose a payment method." };

  const result = await startPayment(user.id, bookingId, method);
  if ("error" in result) return { error: result.error };

  redirect(result.redirectUrl);
}
