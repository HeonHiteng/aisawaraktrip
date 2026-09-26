import { Award } from "lucide-react";
import { isMustSee } from "@/types/catalogue";

/** "Must-see" for the top-ranked places (rank 1-5), nothing for the rest. Sits on a photo (top-left), like the "Verified" badge on experience cards. */
export function MustSeeBadge({ rank }: { rank: number | null }) {
  if (!isMustSee(rank)) return null;
  return (
    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
      <Award className="size-3.5" aria-hidden />
      Must-see
    </span>
  );
}
