import Stripe from "stripe";
import { site } from "@/lib/site";
import type {
  CreateSessionInput,
  PaymentProvider,
  PaymentSession,
  VerifiedPayment,
} from "@/lib/payments/types";
import type { PaymentMethod } from "@/types/payment";

/**
 * Stripe Checkout (hosted page — card data never touches our servers). Works with a free test-mode
 * account today and live keys later; nothing changes but the keys.
 *
 * createSession  -> a Checkout Session for exactly the amount WE snapshotted (never the client's).
 * verify         -> two ways in, both authenticated:
 *   webhook  { payload, signature }  raw body + `Stripe-Signature`, checked with STRIPE_WEBHOOK_SECRET
 *   return   { session_id }          the traveller coming back: we re-fetch the session from Stripe
 *                                    with our secret key, so the URL alone can't claim "paid".
 * `settlePayment` (lib/domain/payments) is the only thing that turns either into a confirmed booking.
 */

/** Thrown for a webhook event we deliberately don't act on; the route acknowledges it with 200. */
export class IgnoredStripeEvent extends Error {}
/** Thrown when a webhook fails signature verification; the route answers 400. */
export class InvalidStripeSignature extends Error {}

/** The slice of the Stripe SDK used here — injected in tests. */
export interface StripeLike {
  checkout: {
    sessions: {
      create(params: Stripe.Checkout.SessionCreateParams): Promise<Stripe.Checkout.Session>;
      retrieve(id: string): Promise<Stripe.Checkout.Session>;
    };
  };
  webhooks: {
    constructEvent(payload: string, header: string, secret: string, tolerance?: number): Stripe.Event;
  };
}

/** Stripe payment-method types for each of our methods (FPX and GrabPay are Malaysian-account features). */
export const STRIPE_METHOD_TYPES: Record<PaymentMethod, Stripe.Checkout.SessionCreateParams.PaymentMethodType[]> = {
  card: ["card"],
  fpx: ["fpx"],
  ewallet: ["grabpay"],
  mock: ["card"],
};

const METHOD_FROM_STRIPE: Record<string, PaymentMethod> = { card: "card", fpx: "fpx", grabpay: "ewallet" };

/** RM 12.34 -> 1234 sen. Rounded, so 0.1 + 0.2 float noise never reaches the gateway. */
export const toMinorUnits = (amountMyr: number) => Math.round(amountMyr * 100);

/** Where Stripe sends people back to: absolute, on this site. */
function absolute(path: string): string {
  return path.startsWith("http") ? path : `${site.url}${path.startsWith("/") ? "" : "/"}${path}`;
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  private readonly stripe: StripeLike;
  private readonly webhookSecret: string | undefined;

  constructor(deps: { stripe?: StripeLike; webhookSecret?: string } = {}) {
    this.webhookSecret = deps.webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET;
    if (deps.stripe) {
      this.stripe = deps.stripe;
    } else {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error("PAYMENT_PROVIDER=stripe needs STRIPE_SECRET_KEY (docs/deployment.md).");
      this.stripe = new Stripe(key, { maxNetworkRetries: 1, timeout: 20_000 }) as unknown as StripeLike;
    }
  }

  async createSession(input: CreateSessionInput): Promise<PaymentSession> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: STRIPE_METHOD_TYPES[input.method] ?? ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: toMinorUnits(input.amount),
            product_data: { name: `Booking ${input.bookingId.slice(0, 8).toUpperCase()}` },
          },
        },
      ],
      customer_email: input.customerEmail,
      client_reference_id: input.bookingId,
      metadata: { bookingId: input.bookingId },
      success_url: `${absolute(input.returnUrl)}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: absolute(`/checkout/${input.bookingId}`),
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // Stripe's minimum is 30 minutes
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { provider: this.name, providerRef: session.id, redirectUrl: session.url };
  }

  async verify(params: Record<string, string>): Promise<VerifiedPayment> {
    if (params.payload !== undefined) return this.fromWebhook(params.payload, params.signature ?? "");
    if (params.session_id) return this.fromSession(await this.stripe.checkout.sessions.retrieve(params.session_id));
    throw new InvalidStripeSignature("Nothing to verify.");
  }

  private fromWebhook(payload: string, signature: string): VerifiedPayment {
    if (!this.webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
    if (!signature) throw new InvalidStripeSignature("Missing Stripe-Signature header.");
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (e) {
      throw new InvalidStripeSignature(e instanceof Error ? e.message : "Bad signature.");
    }
    const session = event.data.object as Stripe.Checkout.Session;
    switch (event.type) {
      case "checkout.session.completed":
        // card: paid now. FPX / GrabPay can complete the session while the bank is still confirming.
        return this.fromSession(session, session.payment_status === "paid" ? "paid" : "pending");
      case "checkout.session.async_payment_succeeded":
        return this.fromSession(session, "paid");
      case "checkout.session.async_payment_failed":
        return this.fromSession(session, "failed");
      case "checkout.session.expired":
        return this.fromSession(session, "cancelled");
      default:
        throw new IgnoredStripeEvent(event.type);
    }
  }

  /** Map a Checkout Session (fetched from Stripe, or carried in a verified event) to our result. */
  private fromSession(session: Stripe.Checkout.Session, forced?: VerifiedPayment["status"]): VerifiedPayment {
    const status: VerifiedPayment["status"] =
      forced ??
      (session.payment_status === "paid"
        ? "paid"
        : session.status === "expired"
          ? "cancelled"
          : "pending");
    const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
    return {
      providerRef: session.id,
      providerPaymentId: intent,
      status,
      amount: (session.amount_total ?? 0) / 100,
      method: METHOD_FROM_STRIPE[session.payment_method_types?.[0] ?? ""] ?? "card",
      raw: {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        amount_total: session.amount_total,
        currency: session.currency,
        client_reference_id: session.client_reference_id,
      },
    };
  }
}
