import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CoverImage } from "@/components/explore/cover-image";
import { adminListAttractions } from "@/lib/domain/admin";
import { formatMYR } from "@/lib/format";
import { toggleAttractionPublished } from "@/app/admin/attractions/actions";

export const metadata: Metadata = { title: "Admin · Attractions" };

export default async function AdminAttractionsPage() {
  const attractions = await adminListAttractions();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Attractions</h1>
        <Link
          href="/admin/attractions/new"
          className={buttonVariants({ variant: "brand", size: "sm" })}
        >
          <Plus className="size-4" />
          New
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Attraction</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                Location
              </th>
              <th className="px-4 py-2.5 text-right font-medium">Entry</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attractions.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <CoverImage
                        url={a.images[0]?.url}
                        alt=""
                        category={a.categories[0]}
                        seed={a.slug}
                      />
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/attractions/${a.id}/edit`}
                        className="font-medium hover:text-primary"
                      >
                        {a.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.categories.join(", ")}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {a.location?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {a.isFree || a.priceMax === 0 ? "Free" : formatMYR(a.priceMin)}
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
                      className={
                        "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                        (a.isPublished
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {a.isPublished ? "Live" : "Draft"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/attractions/${a.id}/edit`}
                    className="inline-flex rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Edit ${a.name}`}
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
