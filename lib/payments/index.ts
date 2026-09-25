import "server-only";
import { DEMO_MODE } from "@/lib/demo/mode";
import { MockPaymentProvider } from "@/lib/payments/mock";
import { StripePaymentProvider } from "@/lib/payments/stripe";
import type { PaymentProvider } from "@/lib/payments/types";

let cached: PaymentProvider | null = null;

/**
 * The mock gateway is a fake page where the TRAVELLER chooses "approve" — there is
 * no bank behind it, so anyone can mark their own booking paid. That is fine for a
 * demo or a test database, and dangerous in front of real bookings. So: in
 * production, with a real database, refuse to run it unless someone explicitly
 * says they know (ALLOW_MOCK_PAYMENTS=true, e.g. for a staging soft-launch).
 */
function assertMockIsSafe() {
  if (
    process.env.NODE_ENV === "production" &&
    !DEMO_MODE &&
    process.env.ALLOW_MOCK_PAYMENTS !== "true"
  ) {
    throw new Error(
      "The mock payment provider is not allowed in production with a real database: " +
        "anyone could confirm a booking without paying. Set PAYMENT_PROVIDER to a real " +
        "provider, or set ALLOW_MOCK_PAYMENTS=true to accept that risk (staging only).",
    );
  }
}

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  const name = process.env.PAYMENT_PROVIDER ?? "mock";
  switch (name) {
    case "stripe":
      cached = new StripePaymentProvider();
      break;
    case "billplz":
      // TODO(phase-7): BillplzPaymentProvider
      assertMockIsSafe();
      cached = new MockPaymentProvider();
      break;
    default:
      assertMockIsSafe();
      cached = new MockPaymentProvider();
  }
  return cached;
}

export type { PaymentProvider } from "@/lib/payments/types";
