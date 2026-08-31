import Link from "next/link";
import { Info } from "lucide-react";

export function GuestBanner() {
  return (
    <div className="border-b border-border bg-muted/60">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
        <Info className="size-3.5 shrink-0" />
        <span>
          You&apos;re browsing as a guest.{" "}
          <Link href="/profile" className="font-medium text-foreground underline">
            Add an email
          </Link>{" "}
          to keep your trips and bookings.
        </span>
      </div>
    </div>
  );
}
