import { cn } from "@/lib/utils";

type Tone = "amber" | "green" | "muted" | "violet" | "blue";

const TONES: Record<Tone, string> = {
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  violet: "bg-primary/15 text-primary",
  blue: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  muted: "bg-muted text-muted-foreground",
};

export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
