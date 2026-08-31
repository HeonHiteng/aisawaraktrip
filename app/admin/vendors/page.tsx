import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { adminListVendors } from "@/lib/domain/admin";
import { cn } from "@/lib/utils";
import {
  deleteVendor,
  setVendorVerification,
} from "@/app/admin/vendors/actions";

export const metadata: Metadata = { title: "Admin · Vendors" };

const TONE = {
  verified: "green",
  pending: "amber",
  unverified: "muted",
  rejected: "muted",
} as const;

export default async function AdminVendorsPage() {
  const vendors = await adminListVendors();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
        <Link
          href="/admin/vendors/new"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <Plus className="size-4" />
          New
        </Link>
      </div>

      <div className="space-y-3">
        {vendors.map((v) => (
          <div
            key={v.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{v.name}</p>
                  <StatusBadge
                    label={v.verificationStatus}
                    tone={TONE[v.verificationStatus]}
                  />
                  {!v.isPublished && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      Unpublished
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {v.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {v.locationName} · {v.contactEmail ?? "no email"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Link
                  href={`/admin/vendors/${v.id}/edit`}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Edit"
                >
                  <Pencil className="size-4" />
                </Link>
                <form action={deleteVendor}>
                  <input type="hidden" name="id" value={v.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </form>
              </div>
            </div>

            {v.verificationStatus !== "verified" && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                <form action={setVendorVerification}>
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="status" value="verified" />
                  <Button type="submit" size="sm">
                    <BadgeCheck className="size-4" />
                    Verify
                  </Button>
                </form>
                <form action={setVendorVerification}>
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <Button type="submit" size="sm" variant="outline">
                    Reject
                  </Button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
