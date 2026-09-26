"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DELETE_CONFIRM_WORD } from "@/lib/account-deletion";
import { deleteMyAccount, type DeleteAccountState } from "@/app/(app)/profile/actions";

/** Two-step, typed-confirmation account deletion (Google Play requires it in the app). */
export function DeleteAccountForm({ isGuest }: { isGuest: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteAccountState, FormData>(deleteMyAccount, {});

  if (!open) {
    return (
      <Button type="button" variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        {isGuest ? "Delete guest data" : "Delete my account"}
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
      <p className="text-sm font-semibold text-destructive">Delete {isGuest ? "your guest data" : "your account"}?</p>
      <p className="text-xs text-muted-foreground">
        This permanently removes your {isGuest ? "" : "profile, "}trips, bookings, payments and reviews. It can&apos;t be undone.
        You can&apos;t delete while you have an upcoming confirmed booking or a refund in progress.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">
          Type <span className="font-mono font-semibold">{DELETE_CONFIRM_WORD}</span> to confirm
        </Label>
        <Input id="confirm" name="confirm" autoComplete="off" autoCapitalize="characters" required disabled={pending} />
      </div>
      <p role="alert" aria-live="polite" className="min-h-4 text-xs text-destructive">
        {state.error}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={pending}>
          Keep it
        </Button>
        <Button type="submit" variant="destructive" className="flex-1" disabled={pending}>
          {pending ? "Deleting…" : "Delete forever"}
        </Button>
      </div>
    </form>
  );
}
