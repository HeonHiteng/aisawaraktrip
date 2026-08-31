import { Lock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { site } from "@/lib/site";

export default async function CheckoutLayout({ children }: LayoutProps<"/"> ) {
  await requireUser();
  return (
    <div className="flex min-h-full flex-col bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <span className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-lg bg-brand-gradient text-sm font-bold text-white">
              S
            </span>
            {site.shortName}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            Secure checkout
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
