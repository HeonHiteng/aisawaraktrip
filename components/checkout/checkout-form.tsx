"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/types/payment";
import { pay, type CheckoutState } from "@/app/checkout/[bookingId]/actions";

export function CheckoutForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    pay,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />

      <fieldset className="space-y-2" disabled={pending}>
        <legend className="mb-2 text-sm font-semibold">Payment method</legend>
        {PAYMENT_METHODS.map((m, i) => (
          <label
            key={m.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
              "border-border hover:bg-accent/50",
              "has-[:checked]:border-primary has-[:checked]:bg-primary/5",
            )}
          >
            <input
              type="radio"
              name="method"
              value={m.value}
              defaultChecked={i === 0}
              className="mt-0.5 accent-[var(--primary)]"
            />
            <span>
              <span className="font-medium">{m.label}</span>
              <span className="block text-xs text-muted-foreground">
                {m.hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        variant="brand"
        className="w-full"
      >
        {pending ? "Opening payment…" : "Continue to payment"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Test mode — no real charge. Card details never touch our servers.
      </p>
    </form>
  );
}
