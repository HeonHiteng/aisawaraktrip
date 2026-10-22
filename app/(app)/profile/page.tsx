import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/common/avatar";
import { ProfileForm } from "@/components/app/profile-form";
import { DeleteAccountForm } from "@/components/app/delete-account-form";
import { UpgradeGuestForm } from "@/components/app/upgrade-guest-form";
import { getProfile, requireUser } from "@/lib/auth";
import { listTrips } from "@/lib/domain/trips";
import { listBookings } from "@/lib/domain/bookings";
import { signOut } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, trips, bookings] = await Promise.all([
    getProfile(),
    listTrips(user.id),
    listBookings(user.id),
  ]);
  const isGuest = user.isAnonymous;
  const isAdmin = profile?.role === "admin";
  const name = isGuest ? "Guest" : (profile?.full_name || "Traveller");
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && b.bookingDate >= today,
  ).length;

  return (
    <div className="space-y-6">
      {/* Identity + activity */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-hero p-5 text-white">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative flex items-center gap-4">
          <Avatar
            name={name}
            className="size-16 text-lg ring-4 ring-white/15"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">
              Profile
            </p>
            <h1 className="truncate text-xl font-bold tracking-tight">{name}</h1>
            <p className="truncate text-sm text-white/75">
              {isGuest
                ? "Not saved to an account yet"
                : (user.email ?? "No email on file")}
            </p>
            {(isAdmin || isGuest) && (
              <span className="mt-1.5 inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
                {isAdmin ? "Admin" : "Guest"}
              </span>
            )}
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <Stat href="/trips" value={trips.length} label={trips.length === 1 ? "Trip" : "Trips"} />
          <Stat
            href="/bookings"
            value={bookings.length}
            label={bookings.length === 1 ? "Booking" : "Bookings"}
          />
          <Stat href="/bookings" value={upcoming} label="Upcoming" />
        </div>
      </section>

      {isGuest ? (
        <UpgradeGuestForm defaultName={profile?.full_name ?? "Guest"} />
      ) : (
        <ProfileForm
          fullName={profile?.full_name ?? ""}
          phone={profile?.phone ?? ""}
          country={profile?.country ?? ""}
        />
      )}

      {isAdmin && (
        <LinkList
          title="Admin"
          rows={[
            {
              href: "/admin",
              icon: LayoutDashboard,
              label: "Admin dashboard",
              hint: "Catalogue, bookings and the food guide",
            },
          ]}
        />
      )}

      <LinkList
        title="About"
        rows={[
          { href: "/privacy", icon: ShieldCheck, label: "Privacy policy" },
          { href: "/terms", icon: FileText, label: "Terms of use" },
          { href: "/credits", icon: ImageIcon, label: "Photo credits" },
        ]}
      />

      {/* Account */}
      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold">Account</h2>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs text-muted-foreground">
            {isGuest
              ? "Create an account above to keep your trips after you sign out."
              : `Signed in with ${user.email ?? "your account"}.`}
          </p>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="h-10 w-full rounded-full">
              <LogOut className="size-4" aria-hidden />
              Sign out
            </Button>
          </form>
          <DeleteAccountForm isGuest={isGuest} />
        </div>
      </section>
    </div>
  );
}

function Stat({ href, value, label }: { href: string; value: number; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white/10 px-3 py-2.5 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <span className="block text-xl font-bold leading-tight">{value}</span>
      <span className="block text-[11px] text-white/75">{label}</span>
    </Link>
  );
}

/** A settings-style group of navigation rows (icon chip, label, optional hint, chevron). */
function LinkList({
  title,
  rows,
}: {
  title: string;
  rows: { href: string; icon: LucideIcon; label: string; hint?: string }[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-sm font-semibold">{title}</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {rows.map(({ href, icon: Icon, label, hint }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex min-h-12 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
            >
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-primary"
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                {hint && (
                  <span className="block truncate text-xs text-muted-foreground">{hint}</span>
                )}
              </span>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
