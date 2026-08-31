import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { VendorForm } from "@/components/admin/vendor-form";
import { adminGetVendor } from "@/lib/domain/admin";
import { saveVendor } from "@/app/admin/vendors/actions";

export const metadata: Metadata = { title: "Edit vendor" };

export default async function EditVendorPage({
  params,
}: PageProps<"/admin/vendors/[id]/edit">) {
  const { id } = await params;
  const vendor = await adminGetVendor(id);
  if (!vendor) notFound();

  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/admin/vendors"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Vendors
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{vendor.name}</h1>
      <VendorForm action={saveVendor} vendor={vendor} />
    </div>
  );
}
