import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-bold tracking-tight text-primary">404</p>
      <h1 className="text-xl font-semibold">This page took a wrong turn</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/" className={cn(buttonVariants(), "bg-brand-gradient text-white")}>
        Back to home
      </Link>
    </div>
  );
}
