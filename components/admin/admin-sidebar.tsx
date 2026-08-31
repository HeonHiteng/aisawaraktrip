"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  MapPin,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

export const ADMIN_LINKS: AdminLink[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/experiences", label: "Experiences", icon: Sparkles },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/attractions", label: "Attractions", icon: MapPin },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/users", label: "Users", icon: Users },
];

function useActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  name,
  signOutAction,
}: {
  name: string;
  signOutAction: () => Promise<void>;
}) {
  const isActive = useActive();

  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-background lg:flex">
      <Link
        href="/admin"
        className="flex h-14 items-center border-b border-border px-5 font-semibold tracking-tight"
      >
        Sarawak · Admin
      </Link>

      <nav className="flex-1 space-y-1 p-3">
        {ADMIN_LINKS.map((l) => {
          const active = isActive(l.href, l.exact);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 text-sm">
        <p className="px-3 py-1 text-xs text-muted-foreground">{name}</p>
        <Link
          href="/home"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Exit to app
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Horizontal tab strip — mobile / tablet only. */
export function AdminNavMobile() {
  const isActive = useActive();
  return (
    <nav className="border-b border-border bg-background lg:hidden">
      <div className="flex gap-1 overflow-x-auto px-2">
        {ADMIN_LINKS.map((l) => {
          const active = isActive(l.href, l.exact);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
