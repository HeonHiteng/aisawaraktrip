"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { continueAsGuest, type AuthState } from "@/app/(auth)/actions";
import { DEMO_MODE } from "@/lib/demo/mode";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
};

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {},
  );
  const [guestState, guestAction, guestPending] = useActionState<
    AuthState,
    FormData
  >(continueAsGuest, {});

  const isRegister = mode === "register";
  const busy = pending || guestPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isRegister ? "Create your account" : "Welcome back"}
        </CardTitle>
        <CardDescription>
          {isRegister
            ? "Plan and book your Sarawak trip in one place."
            : "Sign in to continue planning your trip."}
        </CardDescription>
        {DEMO_MODE && (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            Demo mode — any button below takes you straight into the app with
            sample data.
          </p>
        )}
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          {isRegister && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                autoComplete="name"
                required
                disabled={busy}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={isRegister ? 8 : undefined}
              disabled={busy}
            />
          </div>

          {(state.error || guestState.error) && (
            <p className="text-sm text-destructive" role="alert">
              {state.error ?? guestState.error}
            </p>
          )}
          {state.message && (
            <p className="text-sm text-primary" role="status">
              {state.message}
            </p>
          )}

          <Button type="submit" className="mt-2 w-full" disabled={busy}>
            {pending
              ? "Please wait…"
              : isRegister
                ? "Create account"
                : "Sign in"}
          </Button>
        </CardContent>
      </form>

      <CardContent className="flex flex-col gap-3 pt-0">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Separator className="flex-1" />
          or
          <Separator className="flex-1" />
        </div>
        <form action={guestAction}>
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={busy}
          >
            {guestPending ? "Please wait…" : "Continue as guest"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Guests can plan trips right away. Add an email later from your profile
          to save them.
        </p>
        <p className="border-t border-border pt-3 text-sm text-muted-foreground">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-foreground underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/register" className="text-foreground underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
