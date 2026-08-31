import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/common/card-grid-skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-32" />
      <ListSkeleton count={3} />
    </div>
  );
}
