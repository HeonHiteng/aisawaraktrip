import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMYR } from "@/lib/format";
import { PAYMENT_METHODS } from "@/types/payment";
import { completeMockPayment } from "@/app/checkout/gateway/actions";

export const metadata: Metadata = { title: "Payment gateway" };

export default async function MockGatewayPage({
  searchParams,
}: PageProps<"/checkout/gateway">) {
  const sp = await searchParams;
  const ref = typeof sp.ref === "string" ? sp.ref : "";
  const amount = typeof sp.amount === "string" ? sp.amount : "0";
  const method = typeof sp.method === "string" ? sp.method : "mock";
  const returnPath = typeof sp.return === "string" ? sp.return : "/bookings";
  if (!ref) redirect("/bookings");

  const methodLabel =
    PAYMENT_METHODS.find((m) => m.value === method)?.label ?? "Test payment";

  const hidden = (
    <>
      <input type="hidden" name="ref" value={ref} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="method" value={method} />
      <input type="hidden" name="return" value={returnPath} />
    </>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="size-5 text-primary" />
          Mock Payments Sarawak
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Sandbox gateway — this screen stands in for FPX / Stripe test mode.
          No real money moves.
        </p>

        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Method</dt>
            <dd>{methodLabel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Reference</dt>
            <dd className="font-mono text-xs">{ref}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
            <dt>Amount</dt>
            <dd>{formatMYR(Number(amount))}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-2">
        <form action={completeMockPayment}>
          {hidden}
          <input type="hidden" name="outcome" value="approve" />
          <Button
            type="submit"
            size="lg"
            className="w-full bg-brand-gradient text-white"
          >
            <ShieldCheck className="size-4" />
            Approve payment
          </Button>
        </form>
        <form action={completeMockPayment}>
          {hidden}
          <input type="hidden" name="outcome" value="decline" />
          <Button type="submit" variant="outline" className="w-full">
            Simulate failed payment
          </Button>
        </form>
        <form action={completeMockPayment}>
          {hidden}
          <input type="hidden" name="outcome" value="cancel" />
          <Button
            type="submit"
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            Cancel and go back
          </Button>
        </form>
      </div>
    </div>
  );
}
