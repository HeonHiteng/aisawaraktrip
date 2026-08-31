import { Skeleton } from "@/components/ui/skeleton";
import { CardGridSkeleton } from "@/components/common/card-grid-skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-full" />
      <CardGridSkeleton count={4} />
    </div>
  );
}
