"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

function Submit({
  confirmLabel,
  pendingLabel,
}: {
  confirmLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      {pending ? pendingLabel : confirmLabel}
    </Button>
  );
}

/**
 * A destructive action that asks first: one tap arms an inline confirmation
 * row (no accidental deletes), a second tap submits the server action.
 */
export function ConfirmSubmit({
  action,
  hidden,
  triggerLabel,
  triggerIcon,
  promptLabel,
  confirmLabel,
  pendingLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  hidden?: Record<string, string>;
  triggerLabel: string;
  triggerIcon?: ReactNode;
  promptLabel: string;
  confirmLabel: string;
  pendingLabel: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setArmed(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        {triggerIcon}
        {triggerLabel}
      </Button>
    );
  }

  return (
    <form
      action={action}
      className="rounded-xl border border-destructive/20 bg-destructive/5 p-3"
    >
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <p className="text-xs text-muted-foreground">{promptLabel}</p>
      <div className="mt-2 flex gap-2">
        <Submit confirmLabel={confirmLabel} pendingLabel={pendingLabel} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setArmed(false)}
        >
          Keep it
        </Button>
      </div>
    </form>
  );
}
