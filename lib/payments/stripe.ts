import type {
  CreateSessionInput,
  PaymentProvider,
  PaymentSession,
  VerifiedPayment,
} from "@/lib/payments/types";

/**
 * Stripe (test mode) — Phase 7 real integration.
 *
 * createSession -> stripe.checkout.sessions.create({
 *   mode: "payment",
 *   payment_method_types: ["card", "fpx", "grabpay"],
 *   line_items: [{ price_data: { currency: "myr", unit_amount: amount*100, ... }, quantity: 1 }],
 *   success_url / cancel_url: input.returnUrl,
 *   metadata: { bookingId },
 * })
 *
 * verify -> this is the WEBHOOK path: stripe.webhooks.constructEvent(rawBody, sig,
 *   STRIPE_WEBHOOK_SECRET); on `checkout.session.completed` mark paid.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  async createSession(_input: CreateSessionInput): Promise<PaymentSession> {
    throw new Error("StripePaymentProvider not implemented yet (Phase 7).");
  }

  async verify(_params: Record<string, string>): Promise<VerifiedPayment> {
    throw new Error("StripePaymentProvider not implemented yet (Phase 7).");
  }
}
