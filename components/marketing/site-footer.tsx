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
        <nav className="flex gap-4">
          <Link href="/explore" className="hover:text-foreground">
            Explore
          </Link>
          <Link href="/plan" className="hover:text-foreground">
            Plan a trip
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
