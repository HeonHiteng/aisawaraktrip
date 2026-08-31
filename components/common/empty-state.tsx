import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The one empty-state pattern for the app: a soft icon chip, a short title,
 * an optional line of guidance, and an optional primary action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-card",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-12 place-items-center rounded-full bg-accent text-primary"
      >
        <Icon className="size-6" />
      </span>
      <h2 className="mt-4 font-semibold">{title}</h2>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && (
        <Link
          href={action.href}
          className={cn(buttonVariants({ variant: "brand", size: "lg" }), "mt-5")}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
