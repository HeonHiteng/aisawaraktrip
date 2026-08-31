import type {
  CreateSessionInput,
  PaymentProvider,
  PaymentSession,
  VerifiedPayment,
} from "@/lib/payments/types";
import type { PaymentMethod } from "@/types/payment";

function rand(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Test/sandbox provider. Renders an in-app fake gateway page instead of
 * redirecting off-site. Stands in until Stripe test mode / Billplz sandbox.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createSession(input: CreateSessionInput): Promise<PaymentSession> {
    const providerRef = rand("mock");
    const params = new URLSearchParams({
      ref: providerRef,
      booking: input.bookingId,
      amount: String(input.amount),
      method: input.method,
      return: input.returnUrl,
    });
    return {
      provider: this.name,
      providerRef,
      redirectUrl: `/checkout/gateway?${params.toString()}`,
    };
  }

  async verify(params: Record<string, string>): Promise<VerifiedPayment> {
    // Mock "signature": we trust the `outcome` param. A real provider would
    // recompute an HMAC over the payload and compare.
    const outcome = params.outcome ?? "cancel";
    const status =
      outcome === "approve"
        ? "paid"
        : outcome === "cancel"
          ? "cancelled"
          : "failed";
    return {
      providerRef: params.ref ?? "",
      providerPaymentId: status === "paid" ? rand("mockpay") : null,
      status,
      amount: Number(params.amount ?? 0),
      method: (params.method as PaymentMethod) ?? "mock",
      raw: { ...params },
    };
  }
}
