"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { upgradeGuestAccount, type AuthState } from "@/app/(auth)/actions";

export function UpgradeGuestForm({ defaultName }: { defaultName?: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    upgradeGuestAccount,
    {},
  );

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle>Save your trips</CardTitle>
        <CardDescription>
          You&apos;re signed in as a guest. Add an email and password to keep
          everything and sign in again later.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
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

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Create account"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
