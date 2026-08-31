import Link from "next/link";
import { site } from "@/lib/site";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-semibold"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-brand-gradient font-bold text-white">
          S
        </span>
        {site.shortName}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
