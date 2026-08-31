import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminNavMobile,
  AdminSidebar,
} from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const profile = await requireAdmin();
  const name = profile.full_name ?? "Admin";

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[15rem_1fr]">
      <AdminSidebar name={name} signOutAction={signOut} />

      <div className="flex min-h-full flex-col">
        {/* mobile / tablet top bar */}
        <header className="border-b border-border bg-background lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/admin" className="font-semibold tracking-tight">
              Sarawak · Admin
            </Link>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Link href="/home" className="hover:text-foreground">
                Exit to app
              </Link>
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" />
                </Button>
              </form>
            </div>
          </div>
        </header>
        <AdminNavMobile />

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
