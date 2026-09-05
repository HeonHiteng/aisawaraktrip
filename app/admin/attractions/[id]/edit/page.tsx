import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AttractionForm } from "@/components/admin/attraction-form";
import { ConfirmSubmit } from "@/components/common/confirm-submit";
import { adminGetAttraction } from "@/lib/domain/admin";
import { demoLocations } from "@/lib/demo/fixtures";
import { deleteAttraction, saveAttraction } from "@/app/admin/attractions/actions";

export const metadata: Metadata = { title: "Edit attraction" };

export default async function EditAttractionPage({
  params,
}: PageProps<"/admin/attractions/[id]/edit">) {
  const { id } = await params;
  const attraction = await adminGetAttraction(id);
  if (!attraction) notFound();

  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/admin/attractions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Attractions
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{attraction.name}</h1>
      <AttractionForm
        action={saveAttraction}
        locations={demoLocations}
        attraction={attraction}
      />

      <div className="border-t border-border pt-5">
        <ConfirmSubmit
          action={deleteAttraction}
          hidden={{ id: attraction.id }}
          triggerLabel="Delete this attraction"
          promptLabel="Delete this attraction? It disappears from Explore and any itineraries that reference it."
          confirmLabel="Delete attraction"
          pendingLabel="Deleting…"
        />
      </div>
    </div>
  );
}
