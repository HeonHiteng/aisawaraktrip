"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upgradeGuestAccount, type AuthState } from "@/app/(auth)/actions";

export function UpgradeGuestForm({ defaultName }: { defaultName?: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    upgradeGuestAccount,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-4 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 shadow-card">
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" />
            Save your account
          </p>
          <p className="text-xs text-muted-foreground">
            You&apos;re signed in as a guest. Add an email and password to keep
            your trips and bookings and sign in again later — same session, nothing
            lost.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="up-fullName">Full name</Label>
          <Input
            id="up-fullName"
            name="fullName"
            defaultValue={defaultName}
            autoComplete="name"
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="up-email">Email</Label>
          <Input
            id="up-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="up-password">Password</Label>
          <Input
            id="up-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={pending}
          />
        </div>

        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}
        {state.message && (
          <p className="text-sm text-primary" role="status">
            {state.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="brand"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
