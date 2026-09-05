import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Pencil, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { Avatar } from "@/components/common/avatar";
import { adminListVendors } from "@/lib/domain/admin";
import { setVendorVerification } from "@/app/admin/vendors/actions";
import type { VerificationStatus } from "@/types/catalogue";

export const metadata: Metadata = { title: "Admin · Vendors" };

const TONE = {
  verified: "green",
  pending: "amber",
  unverified: "muted",
  rejected: "muted",
} as const;

// pending / unverified vendors need attention — float them to the top
const ORDER: Record<VerificationStatus, number> = {
  pending: 0,
  unverified: 1,
  rejected: 2,
  verified: 3,
};

export default async function AdminVendorsPage() {
  const vendors = [...(await adminListVendors())].sort(
    (a, b) => ORDER[a.verificationStatus] - ORDER[b.verificationStatus],
  );
  const needsAttention = vendors.filter(
    (v) => v.verificationStatus === "pending" || v.verificationStatus === "unverified",
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          {needsAttention > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {needsAttention} awaiting review
            </p>
          )}
        </div>
        <Link
          href="/admin/vendors/new"
          className={buttonVariants({ variant: "brand", size: "sm" })}
        >
          <Plus className="size-4" />
          New
        </Link>
      </div>

      <div className="space-y-3">
        {vendors.map((v) => (
          <div
            key={v.id}
            className="rounded-2xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <Avatar
                  name={v.name}
                  src={v.avatarUrl}
                  className="size-9 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
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
                  {v.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {v.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {v.locationName ?? "No location"} ·{" "}
                    {v.contactEmail ?? "no email"}
                  </p>
                </div>
              </div>
              <Link
                href={`/admin/vendors/${v.id}/edit`}
                className="inline-flex shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Edit ${v.name}`}
              >
                <Pencil className="size-4" />
              </Link>
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
