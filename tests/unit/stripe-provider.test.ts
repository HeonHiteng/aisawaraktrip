import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
  IgnoredStripeEvent,
  InvalidStripeSignature,
  StripePaymentProvider,
  toMinorUnits,
  type StripeLike,
} from "@/lib/payments/stripe";

/**
 * The Stripe provider with a fake API (no network) and the REAL signature check, using the SDK's
 * own header generator — so a wrong secret, a tampered body or a stale timestamp really fails.
 */

const SECRET = "whsec_test_secret_value";
const sdk = new Stripe("sk_test_dummy"); // constructs offline; used only for the signing helpers

const session = (over: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session =>
  ({
    id: "cs_test_abc123",
    object: "checkout.session",
    payment_status: "paid",
    status: "complete",
    amount_total: 31800,
    currency: "myr",
    payment_intent: "pi_123",
    payment_method_types: ["card"],
    client_reference_id: "booking-1",
    ...over,
  }) as Stripe.Checkout.Session;

function fake(over: { create?: (p: Stripe.Checkout.SessionCreateParams) => Promise<Stripe.Checkout.Session>; retrieve?: (id: string) => Promise<Stripe.Checkout.Session> } = {}) {
  const calls = { create: [] as Stripe.Checkout.SessionCreateParams[], retrieve: [] as string[] };
  const client: StripeLike = {
    checkout: {
      sessions: {
        create: async (p) => {
          calls.create.push(p);
          return over.create ? over.create(p) : session({ url: "https://checkout.stripe.com/c/pay/cs_test_abc123" });
        },
        retrieve: async (id) => {
          calls.retrieve.push(id);
          return over.retrieve ? over.retrieve(id) : session();
        },
      },
    },
    webhooks: sdk.webhooks as unknown as StripeLike["webhooks"],
  };
  return { client, calls, provider: new StripePaymentProvider({ stripe: client, webhookSecret: SECRET }) };
}

const event = (type: string, obj: Stripe.Checkout.Session) => JSON.stringify({ id: "evt_1", object: "event", type, data: { object: obj } });
const sign = (payload: string, secret = SECRET, timestamp?: number) => sdk.webhooks.generateTestHeaderString({ payload, secret, timestamp });

describe("createSession", () => {
  const input = {
    bookingId: "b7c1d2e3-0000-4000-8000-000000000001",
    amount: 318,
    currency: "MYR",
    method: "fpx" as const,
    customerEmail: "sam@example.test",
    customerName: "Sam",
    returnUrl: "/checkout/b7c1d2e3-0000-4000-8000-000000000001/result",
  };

  it("charges exactly the server-side amount in sen, in MYR, for the chosen method", async () => {
    const { provider, calls } = fake();
    const s = await provider.createSession(input);
    expect(s).toEqual({ provider: "stripe", providerRef: "cs_test_abc123", redirectUrl: "https://checkout.stripe.com/c/pay/cs_test_abc123" });
    const p = calls.create[0];
    expect(p.mode).toBe("payment");
    expect(p.payment_method_types).toEqual(["fpx"]);
    expect(p.line_items?.[0].price_data).toMatchObject({ currency: "myr", unit_amount: 31800 });
    expect(p.customer_email).toBe("sam@example.test");
    expect(p.client_reference_id).toBe(input.bookingId);
  });

  it("maps our methods to Stripe's (card, FPX, GrabPay)", async () => {
    for (const [method, types] of [["card", ["card"]], ["fpx", ["fpx"]], ["ewallet", ["grabpay"]]] as const) {
      const { provider, calls } = fake();
      await provider.createSession({ ...input, method });
      expect(calls.create[0].payment_method_types).toEqual(types);
    }
  });

  it("returns to an absolute URL on this site carrying the session id, and cancels back to checkout", async () => {
    const { provider, calls } = fake();
    await provider.createSession(input);
    expect(calls.create[0].success_url).toMatch(/^https?:\/\/[^/]+\/checkout\/.+\/result\?session_id=\{CHECKOUT_SESSION_ID\}$/);
    expect(calls.create[0].cancel_url).toMatch(/^https?:\/\/[^/]+\/checkout\/b7c1d2e3-/);
  });

  it("gives Stripe a valid expiry (>= 30 minutes) and refuses a response with no URL", async () => {
    const { provider, calls } = fake();
    await provider.createSession(input);
    const secs = calls.create[0].expires_at! - Math.floor(Date.now() / 1000);
    expect(secs).toBeGreaterThanOrEqual(30 * 60);
    expect(secs).toBeLessThanOrEqual(24 * 3600);
    const noUrl = fake({ create: async () => session({ url: null }) });
    await expect(noUrl.provider.createSession(input)).rejects.toThrow(/checkout URL/);
  });

  it("sen conversion never leaks float noise", () => {
    expect(toMinorUnits(318)).toBe(31800);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
    expect(toMinorUnits(45.5)).toBe(4550);
    expect(toMinorUnits(19.99)).toBe(1999);
  });

  it("refuses to start without a secret key", () => {
    const prev = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      expect(() => new StripePaymentProvider()).toThrow(/STRIPE_SECRET_KEY/);
    } finally {
      if (prev !== undefined) process.env.STRIPE_SECRET_KEY = prev;
    }
  });
});

describe("verify — traveller returns from Stripe", () => {
  it("re-fetches the session from Stripe and reports what Stripe says (never the URL)", async () => {
    const { provider, calls } = fake({ retrieve: async () => session({ payment_status: "paid", amount_total: 31800 }) });
    const v = await provider.verify({ session_id: "cs_test_abc123" });
    expect(calls.retrieve).toEqual(["cs_test_abc123"]);
    expect(v).toMatchObject({ providerRef: "cs_test_abc123", providerPaymentId: "pi_123", status: "paid", amount: 318, method: "card" });
  });

  it("an unpaid open session is pending, an expired one is cancelled", async () => {
    const open = fake({ retrieve: async () => session({ payment_status: "unpaid", status: "open" }) });
    expect((await open.provider.verify({ session_id: "cs_x" })).status).toBe("pending");
    const expired = fake({ retrieve: async () => session({ payment_status: "unpaid", status: "expired" }) });
    expect((await expired.provider.verify({ session_id: "cs_x" })).status).toBe("cancelled");
  });

  it("maps the method back (FPX, GrabPay -> ewallet)", async () => {
    const f = fake({ retrieve: async () => session({ payment_method_types: ["grabpay"] }) });
    expect((await f.provider.verify({ session_id: "cs_x" })).method).toBe("ewallet");
  });

  it("nothing to verify -> an error, never 'paid'", async () => {
    await expect(fake().provider.verify({})).rejects.toBeInstanceOf(InvalidStripeSignature);
  });
});

describe("verify — webhook signature", () => {
  it("accepts a correctly signed checkout.session.completed", async () => {
    const payload = event("checkout.session.completed", session());
    const v = await fake().provider.verify({ payload, signature: sign(payload) });
    expect(v).toMatchObject({ providerRef: "cs_test_abc123", status: "paid", amount: 318, providerPaymentId: "pi_123" });
  });

  it("rejects a wrong secret, a tampered body, a missing header and a stale timestamp", async () => {
    const { provider } = fake();
    const payload = event("checkout.session.completed", session());
    await expect(provider.verify({ payload, signature: sign(payload, "whsec_someone_else") })).rejects.toBeInstanceOf(InvalidStripeSignature);
    const tampered = payload.replace("31800", "100");
    await expect(provider.verify({ payload: tampered, signature: sign(payload) })).rejects.toBeInstanceOf(InvalidStripeSignature);
    await expect(provider.verify({ payload, signature: "" })).rejects.toBeInstanceOf(InvalidStripeSignature);
    const old = Math.floor(Date.now() / 1000) - 3600; // replayed an hour later
    await expect(provider.verify({ payload, signature: sign(payload, SECRET, old) })).rejects.toBeInstanceOf(InvalidStripeSignature);
  });

  it("fails loudly (not open) if the webhook secret isn't configured", async () => {
    const p = new StripePaymentProvider({ stripe: fake().client, webhookSecret: "" });
    const payload = event("checkout.session.completed", session());
    await expect(p.verify({ payload, signature: sign(payload) })).rejects.toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  it("an async method (FPX/GrabPay) that completed but isn't paid yet is pending, then paid or failed", async () => {
    const { provider } = fake();
    const unpaid = event("checkout.session.completed", session({ payment_status: "unpaid" }));
    expect((await provider.verify({ payload: unpaid, signature: sign(unpaid) })).status).toBe("pending");
    const ok = event("checkout.session.async_payment_succeeded", session());
    expect((await provider.verify({ payload: ok, signature: sign(ok) })).status).toBe("paid");
    const bad = event("checkout.session.async_payment_failed", session({ payment_status: "unpaid" }));
    expect((await provider.verify({ payload: bad, signature: sign(bad) })).status).toBe("failed");
  });

  it("an expired session cancels; unrelated events are ignored, not acted on", async () => {
    const { provider } = fake();
    const exp = event("checkout.session.expired", session({ payment_status: "unpaid", status: "expired" }));
    expect((await provider.verify({ payload: exp, signature: sign(exp) })).status).toBe("cancelled");
    const other = event("customer.created", session());
    await expect(provider.verify({ payload: other, signature: sign(other) })).rejects.toBeInstanceOf(IgnoredStripeEvent);
  });
});
