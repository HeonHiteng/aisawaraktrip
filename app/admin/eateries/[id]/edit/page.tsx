import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EateryForm } from "@/components/admin/eatery-form";
import { AdminNotice } from "@/components/admin/admin-notice";
import { ConfirmSubmit } from "@/components/common/confirm-submit";
import { adminGetEatery } from "@/lib/domain/admin";
import { deleteEatery, saveEatery } from "@/app/admin/eateries/actions";

export const metadata: Metadata = { title: "Edit eatery" };

export default async function EditEateryPage({
  params,
  searchParams,
}: PageProps<"/admin/eateries/[id]/edit">) {
  const { id } = await params;
  const sp = await searchParams;
  const eatery = await adminGetEatery(id);
  if (!eatery) notFound();

  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/admin/eateries"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Food guide
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{eatery.name}</h1>
      <AdminNotice message={sp.error} />
      <EateryForm action={saveEatery} eatery={eatery} />

      <div className="border-t border-border pt-5">
        <ConfirmSubmit
          action={deleteEatery}
          hidden={{ id: eatery.id }}
          triggerLabel="Delete this eatery"
          promptLabel="Delete this eatery? It disappears from the food guide."
          confirmLabel="Delete eatery"
          pendingLabel="Deleting…"
        />
      </div>
    </div>
  );
}
