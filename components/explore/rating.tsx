import { Star } from "lucide-react";

export function Rating({
  value,
  count,
  className,
}: {
  value: number | null;
  count?: number;
  className?: string;
}) {
  if (value == null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${className ?? ""}`}
    >
      <Star className="size-3.5 fill-amber-400 text-amber-400" />
      {value.toFixed(1)}
      {count != null && (
        <span className="text-muted-foreground">({count})</span>
      )}
    </span>
  );
}
