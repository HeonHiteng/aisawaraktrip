import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { adminListEateries } from "@/lib/domain/admin";
import { dishLabel, PRICE_TIER_LABEL } from "@/types/eatery";
import { toggleEateryPublished } from "@/app/admin/eateries/actions";

export const metadata: Metadata = { title: "Admin · Food guide" };

export default async function AdminEateriesPage() {
  const eateries = await adminListEateries();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Food guide</h1>
        <Link href="/admin/eateries/new" className={buttonVariants({ variant: "brand", size: "sm" })}>
          <Plus className="size-4" />
          New
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Eatery</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">City</th>
              <th className="px-4 py-2.5 font-medium">Price</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {eateries.map((e) => (
              <tr key={e.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link href={`/admin/eateries/${e.id}/edit`} className="font-medium hover:text-primary">
                    {e.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.dishes.map(dishLabel).join(", ") || "—"}
                    {e.isSplurge ? " · splurge" : ""}
                  </p>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{e.city}</td>
                <td className="px-4 py-3">{e.priceTier ? PRICE_TIER_LABEL[e.priceTier] : "—"}</td>
                <td className="px-4 py-3">
                  <form action={toggleEateryPublished}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="next" value={(!e.isPublished).toString()} />
                    <button
                      type="submit"
                      className={
                        "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                        (e.isPublished
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {e.isPublished ? "Live" : "Draft"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/eateries/${e.id}/edit`}
                    className="inline-flex rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Edit ${e.name}`}
                  >
                    <Pencil className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
