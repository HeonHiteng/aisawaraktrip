"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="default" size="sm" disabled={pending}>
      {pending ? "Regenerating…" : "Yes, regenerate"}
    </Button>
  );
}

/**
 * "Regenerate whole trip" asks first — it discards any refining/editing done so far — but,
 * unlike delete, it isn't catastrophic (you can always refine again), so it gets a neutral
 * confirm rather than ConfirmSubmit's destructive-red one.
 */
export function RegenerateButton({
  action,
  tripId,
}: {
  action: (formData: FormData) => Promise<void>;
  tripId: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setArmed(true)}>
        <RefreshCw className="size-4" />
        Regenerate whole trip
      </Button>
    );
  }

  return (
    <form action={action} className="rounded-xl border border-border bg-muted/50 p-3">
      <input type="hidden" name="tripId" value={tripId} />
      <p className="text-xs text-muted-foreground">
        This replaces the whole plan, including anything you&apos;ve refined or edited.
      </p>
      <div className="mt-2 flex gap-2">
        <Submit />
        <Button type="button" variant="ghost" size="sm" onClick={() => setArmed(false)}>
          Keep it
        </Button>
      </div>
    </form>
  );
}
