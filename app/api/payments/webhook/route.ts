import { NextResponse, type NextRequest } from "next/server";
import { settlePayment } from "@/lib/domain/payments";
import { getPaymentProvider } from "@/lib/payments";
import { IgnoredStripeEvent, InvalidStripeSignature } from "@/lib/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Payment provider webhook (Stripe). The ONLY thing that authenticates a call here is the
 * signature: `settlePayment` hands the raw body + `Stripe-Signature` to the provider, which
 * checks it against STRIPE_WEBHOOK_SECRET. A bad signature is a 400 and changes nothing.
 *
 * Settlement is idempotent (a retried or duplicated event can't confirm a booking twice), and
 * anything that isn't a payment event we act on is acknowledged with 200 so Stripe doesn't
 * keep retrying it. A real failure (database down) is a 500, so Stripe retries later.
 */
export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();
  if (provider.name !== "stripe") {
    // the mock gateway settles in-app; there's nothing external to receive
    return NextResponse.json({ received: false, reason: "no external provider configured" }, { status: 404 });
  }

  const payload = await request.text(); // the exact bytes Stripe signed — never re-serialised
  const signature = request.headers.get("stripe-signature") ?? "";

  try {
    const { status } = await settlePayment(null, { payload, signature });
    return NextResponse.json({ received: true, status });
  } catch (e) {
    if (e instanceof InvalidStripeSignature) {
      return NextResponse.json({ error: "invalid signature" }, { status: 400 });
    }
    if (e instanceof IgnoredStripeEvent) {
      return NextResponse.json({ received: true, ignored: e.message });
    }
    console.error("[payments] webhook failed", e);
    return NextResponse.json({ error: "webhook failed" }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ status: "payments webhook ready" });
}
