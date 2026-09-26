import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EateryForm } from "@/components/admin/eatery-form";
import { saveEatery } from "@/app/admin/eateries/actions";

export const metadata: Metadata = { title: "New eatery" };

export default function NewEateryPage() {
  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/admin/eateries"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Food guide
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">New eatery</h1>
      <EateryForm action={saveEatery} />
    </div>
  );
}
