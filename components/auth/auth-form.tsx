"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { continueAsGuest, type AuthState } from "@/app/(auth)/actions";
import { DEMO_MODE } from "@/lib/demo/mode";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  /** Where to send the user after they sign in. */
  next?: string;
};

const FIELD = "h-11 rounded-xl px-3.5";

export function AuthForm({ mode, action, next }: Props) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {},
  );
  const [guestState, guestAction, guestPending] = useActionState<
    AuthState,
    FormData
  >(continueAsGuest, {});

  // Controlled on purpose: React clears uncontrolled fields after a server action, so a wrong
  // password would wipe the email too. (The password itself is meant to clear.)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isRegister = mode === "register";
  const busy = pending || guestPending;
  const error = state.error ?? guestState.error;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        {isRegister ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isRegister
          ? "Save your trips and bookings, and pick up on any device."
          : "Sign in to pick up your trips and bookings."}
      </p>
      {DEMO_MODE && (
        <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
          Demo mode — any button below takes you straight into the app with
          sample data.
        </p>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        {isRegister && (
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              name="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
              disabled={busy}
              className={FIELD}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={busy}
            className={FIELD}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={isRegister ? 8 : undefined}
              aria-describedby={isRegister ? "password-hint" : undefined}
              disabled={busy}
              className={`${FIELD} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-controls="password"
              title={showPassword ? "Hide" : "Show"}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
              <span className="sr-only">{showPassword ? "Hide" : "Show"} characters</span>
            </button>
          </div>
          {isRegister && (
            <p id="password-hint" className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {state.message && (
          <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary" role="status">
            {state.message}
          </p>
        )}

        <Button type="submit" size="lg" className="h-11 w-full rounded-full" disabled={busy}>
          {pending ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        or
        <Separator className="flex-1" />
      </div>

      <form action={guestAction}>
        {next && <input type="hidden" name="next" value={next} />}
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="h-11 w-full rounded-full"
          disabled={busy}
        >
          <UserRound className="size-4" aria-hidden />
          {guestPending ? "Please wait…" : "Continue as guest"}
        </Button>
      </form>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        No sign-up needed. Add an email later from your profile to keep your trips.
      </p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link
              href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
              className="font-semibold text-primary hover:underline"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
              className="font-semibold text-primary hover:underline"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
