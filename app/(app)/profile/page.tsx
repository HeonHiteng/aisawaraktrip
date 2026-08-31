import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, LogOut, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/common/avatar";
import { ProfileForm } from "@/components/app/profile-form";
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
  const name = isGuest ? "Guest" : (profile?.full_name ?? "Traveller");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      {/* Identity */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Avatar name={name} className="size-14 text-base" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{name}</p>
            {profile?.role === "admin" && (
              <Badge variant="secondary">Admin</Badge>
            )}
            {isGuest && <Badge variant="outline">Guest</Badge>}
          </div>
          <p className="text-sm break-words text-muted-foreground">
            {isGuest
              ? "This guest session isn't saved to an account."
              : (user.email ?? "No email on file")}
          </p>
        </div>
      </div>

      {/* Activity */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/trips"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CalendarDays className="size-5 text-primary" />
          <div>
            <p className="text-lg font-bold leading-none">{trips.length}</p>
            <p className="text-xs text-muted-foreground">
              {trips.length === 1 ? "Trip" : "Trips"}
            </p>
          </div>
        </Link>
        <Link
          href="/bookings"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Ticket className="size-5 text-primary" />
          <div>
            <p className="text-lg font-bold leading-none">{bookings.length}</p>
            <p className="text-xs text-muted-foreground">
              {bookings.length === 1 ? "Booking" : "Bookings"}
            </p>
          </div>
        </Link>
      </div>

      {isGuest ? (
        <UpgradeGuestForm defaultName={profile?.full_name ?? "Guest"} />
      ) : (
        <ProfileForm
          fullName={profile?.full_name ?? ""}
          phone={profile?.phone ?? ""}
          country={profile?.country ?? ""}
        />
      )}

      {/* Account */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <p className="text-sm font-semibold">Account</p>
        <p className="text-xs text-muted-foreground">
          {isGuest
            ? "Create an account above to keep your trips after you sign out."
            : `Signed in with ${user.email ?? "your account"}.`}
        </p>
        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
