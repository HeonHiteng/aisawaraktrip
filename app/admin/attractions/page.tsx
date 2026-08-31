import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { adminListAttractions } from "@/lib/domain/admin";
import { formatMYR } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteAttraction,
  toggleAttractionPublished,
} from "@/app/admin/attractions/actions";

export const metadata: Metadata = { title: "Admin · Attractions" };

export default async function AdminAttractionsPage() {
  const attractions = await adminListAttractions();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Attractions</h1>
        <Link
          href="/admin/attractions/new"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <Plus className="size-4" />
          New
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                Location
              </th>
              <th className="px-4 py-2.5 text-right font-medium">Entry</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attractions.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.categories.join(", ")}
                  </p>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {a.location?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {a.isFree || a.priceMax === 0
                    ? "Free"
                    : formatMYR(a.priceMin)}
                </td>
                <td className="px-4 py-3">
                  <form action={toggleAttractionPublished}>
                    <input type="hidden" name="id" value={a.id} />
                    <input
                      type="hidden"
                      name="next"
                      value={(!a.isPublished).toString()}
                    />
                    <button
                      type="submit"
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        a.isPublished
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {a.isPublished ? "Live" : "Draft"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/admin/attractions/${a.id}/edit`}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <form action={deleteAttraction}>
                      <input type="hidden" name="id" value={a.id} />
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
