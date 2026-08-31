import { AppHeader } from "@/components/app/app-header";
import { AppNav } from "@/components/app/app-nav";
import { DemoBanner } from "@/components/app/demo-banner";
import { GuestBanner } from "@/components/app/guest-banner";
import { DEMO_MODE } from "@/lib/demo/mode";
import { getProfile, requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const profile = await getProfile();
  const isGuest = user.isAnonymous;

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader name={isGuest ? "Guest" : profile?.full_name} />
      {DEMO_MODE ? (
        <DemoBanner persona={profile?.role === "admin" ? "admin" : isGuest ? "guest" : "tourist"} />
      ) : (
        isGuest && <GuestBanner />
      )}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-24">
        {children}
      </main>
      <AppNav />
    </div>
  );
}
