"use client";

import { useActionState, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  submitReview,
  type ReviewState,
} from "@/app/(app)/explore/experiences/[slug]/actions";

export function ReviewForm({
  experienceId,
  slug,
}: {
  experienceId: string;
  slug: string;
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(
    submitReview,
    {},
  );
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    if (state.ok) toast.success("Thanks — your review is live.");
    if (state.error) toast.error(state.error);
  }, [state]);

  // On success the server revalidates the page, which swaps this form for the
  // "you've already reviewed this" note — so no separate success view here.
  const shown = hover || rating;

  return (
    <form action={action} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <input type="hidden" name="experienceId" value={experienceId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <p className="text-sm font-medium">Your rating</p>
        <div
          className="mt-1 flex gap-1"
          role="radiogroup"
          aria-label="Rating out of 5"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              aria-label={`${i} star${i === 1 ? "" : "s"}`}
              onMouseEnter={() => setHover(i)}
              onClick={() => setRating(i)}
              className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star
                className={cn(
                  "size-6 transition-colors",
                  shown >= i
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="review-comment" className="text-sm font-medium">
          Your review
        </label>
        <Textarea
          id="review-comment"
          name="comment"
          rows={3}
          required
          minLength={10}
          maxLength={600}
          placeholder="What should other travellers know?"
          disabled={pending}
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        variant="brand"
        disabled={pending || rating === 0}
        className="w-full"
      >
        {pending ? "Posting…" : "Post review"}
      </Button>
    </form>
  );
}
