import { cn } from "@/lib/utils";

/** Subtle "this is demo data" marker for catalogue imagery. */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute bottom-2 left-2 rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm",
        className,
      )}
    >
      Sample
    </span>
  );
}
