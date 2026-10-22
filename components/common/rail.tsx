import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A titled, horizontally scrolling row of cards (snap scrolling, no visible scrollbar).
 * Bleeds to the screen edge on phones (`-mx-4` against the app's `px-4` gutter) so the
 * next card peeks in and says "swipe". Children are `RailItem`s.
 */
export function Rail({
  title,
  description,
  href,
  linkLabel = "See all",
  children,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="-my-2 shrink-0 rounded-full px-2 py-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {linkLabel}
          </Link>
        )}
      </div>
      <ul
        aria-label={title}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
    </section>
  );
}

/** One card slot in a `Rail`. Width is fixed so the row reads as a carousel. */
export function RailItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li className={cn("w-[17rem] shrink-0 snap-start", className)}>
      {children}
    </li>
  );
}
