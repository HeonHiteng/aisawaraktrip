import { NextResponse, type NextRequest } from "next/server";

/**
 * Payment provider webhook — Phase 7 real integration.
 *
 * Real flow:
 *   1. read the raw body + signature header
 *   2. provider.verify() with the webhook secret (Stripe: constructEvent;
 *      Billplz: X-Signature HMAC) — reject on mismatch
 *   3. look up the payment by providerRef using the SERVICE-ROLE client
 *   4. mark payment paid + booking confirmed + send the confirmation email
 *      (all server-side; never trust the client)
 *
 * In demo mode there is no external provider — the mock gateway settles via
 * `settlePayment` on the return action instead, so this endpoint just ACKs.
 */
export async function POST(_request: NextRequest) {
  // TODO(phase-7): verify signature, then settlePayment(...) with service role
  return NextResponse.json({ received: true });
}

export function GET() {
  return NextResponse.json({ status: "payments webhook ready" });
}
