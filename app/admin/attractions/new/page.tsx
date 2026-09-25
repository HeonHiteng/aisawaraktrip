import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AttractionForm } from "@/components/admin/attraction-form";
import { listLocations } from "@/lib/domain/catalogue";
import { saveAttraction } from "@/app/admin/attractions/actions";

export const metadata: Metadata = { title: "New attraction" };

export default async function NewAttractionPage() {
  const locations = await listLocations();
  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/admin/attractions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Attractions
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">New attraction</h1>
      <AttractionForm action={saveAttraction} locations={locations} />
    </div>
  );
}
