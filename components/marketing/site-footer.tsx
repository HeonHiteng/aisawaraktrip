import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.name}. MVP — demo data shown for
          illustration.
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/explore" className="hover:text-foreground">
            Explore
          </Link>
          <Link href="/plan" className="hover:text-foreground">
            Plan a trip
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
