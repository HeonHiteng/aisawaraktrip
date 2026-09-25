import Link from "next/link";
import { site } from "@/lib/site";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-lg font-semibold">
        <span className="grid size-8 place-items-center rounded-lg bg-brand-gradient font-bold text-white">
          S
        </span>
        {site.shortName}
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <nav
        aria-label="Legal"
        className="mt-8 flex gap-4 text-xs text-muted-foreground"
      >
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
      </nav>
    </div>
  );
}
