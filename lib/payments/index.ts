import "server-only";
import { MockPaymentProvider } from "@/lib/payments/mock";
import { StripePaymentProvider } from "@/lib/payments/stripe";
import type { PaymentProvider } from "@/lib/payments/types";

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  const name = process.env.PAYMENT_PROVIDER ?? "mock";
  switch (name) {
    case "stripe":
      cached = new StripePaymentProvider();
      break;
    case "billplz":
      // TODO(phase-7): BillplzPaymentProvider
      cached = new MockPaymentProvider();
      break;
    default:
      cached = new MockPaymentProvider();
  }
  return cached;
}

export type { PaymentProvider } from "@/lib/payments/types";
