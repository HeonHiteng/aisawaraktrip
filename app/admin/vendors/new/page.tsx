import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VendorForm } from "@/components/admin/vendor-form";
import { saveVendor } from "@/app/admin/vendors/actions";

export const metadata: Metadata = { title: "New vendor" };

export default function NewVendorPage() {
  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/admin/vendors"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Vendors
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">New vendor</h1>
      <VendorForm action={saveVendor} />
    </div>
  );
}
