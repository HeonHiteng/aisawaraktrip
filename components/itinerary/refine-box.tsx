"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Sparkles, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { refineTrip, type RefineState } from "@/app/(app)/trips/actions";

const PRESETS = [
  "Make it cheaper",
  "Add more food",
  "Less packed",
  "No outdoor activities on day 2",
];

export function RefineBox({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<RefineState, FormData>(
    refineTrip,
    {},
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.note && !state.error) {
      router.refresh();
      toast.success("Itinerary updated", { description: state.note });
      if (inputRef.current) inputRef.current.value = "";
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Wand2 className="size-4 text-primary" />
        Refine with AI
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Ask in plain language — “make day 2 cheaper”, “replace this with a food
        activity”.
      </p>

      <form action={action} className="mt-3 flex gap-2">
        <input type="hidden" name="tripId" value={tripId} />
        <Input
          ref={inputRef}
          name="instruction"
          placeholder="What should change?"
          disabled={pending}
          className="bg-background"
        />
        <Button type="submit" variant="brand" disabled={pending}>
          <Sparkles className="size-4" />
          {pending ? "…" : "Go"}
        </Button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <form key={p} action={action}>
            <input type="hidden" name="tripId" value={tripId} />
            <input type="hidden" name="instruction" value={p} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              {p}
            </button>
          </form>
        ))}
      </div>

      {state.note && (
        <p className="mt-3 text-xs text-primary" role="status">
          {state.note}
        </p>
      )}
      {state.error && (
        <p className="mt-3 text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
