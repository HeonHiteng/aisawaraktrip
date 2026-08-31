import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";
import { signOut } from "@/app/(auth)/actions";

export function AppHeader({ name }: { name?: string | null }) {
  return (
    <header className="sticky top-0 z-40 bg-brand-hero text-white">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/home" className="flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-lg bg-white/15 text-sm font-bold">
            S
          </span>
          <span className="tracking-tight">{site.shortName}</span>
        </Link>
        <div className="flex items-center gap-3">
          {name ? (
            <span className="hidden text-sm text-white/70 sm:inline">
              {name}
            </span>
          ) : null}
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
