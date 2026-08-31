import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-lg bg-brand-gradient text-sm font-bold text-white">
            S
          </span>
          <span className="tracking-tight">{site.shortName}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/explore"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Explore
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden sm:inline-flex",
            )}
          >
            Sign in
          </Link>
          <Link href="/plan" className={cn(buttonVariants({ size: "sm" }))}>
            Plan a trip
          </Link>
        </nav>
      </div>
    </header>
  );
}
