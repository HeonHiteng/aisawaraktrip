import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/app/profile-form";
import { UpgradeGuestForm } from "@/components/app/upgrade-guest-form";
import { getProfile, getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const profile = await getProfile();
  const isGuest = user.isAnonymous;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        {profile?.role === "admin" && <Badge variant="secondary">Admin</Badge>}
        {isGuest && <Badge variant="outline">Guest</Badge>}
      </div>

      {isGuest ? (
        <UpgradeGuestForm defaultName={profile?.full_name ?? "Guest"} />
      ) : (
        <ProfileForm
          email={user.email ?? ""}
          fullName={profile?.full_name ?? ""}
          phone={profile?.phone ?? ""}
          country={profile?.country ?? ""}
        />
      )}
    </div>
  );
}
