import { Avatar } from "@/components/common/avatar";
import { Stars } from "@/components/reviews/stars";
import { formatDate } from "@/lib/format";
import type { Review } from "@/types/review";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        No traveller reviews yet — be the first once you&apos;ve done this
        experience.
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {reviews.map((r) => (
        <li key={r.id} className="flex gap-3">
          <Avatar name={r.authorName} className="size-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium">{r.authorName}</span>
              <Stars value={r.rating} size="size-3.5" />
              <span className="text-xs text-muted-foreground">
                {formatDate(r.createdAt, { year: "numeric" })}
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground/90">{r.comment}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
