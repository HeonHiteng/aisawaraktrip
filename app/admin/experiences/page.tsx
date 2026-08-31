import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { adminListExperiences } from "@/lib/domain/admin";
import { formatMYR } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteExperience,
  toggleExperiencePublished,
} from "@/app/admin/experiences/actions";

export const metadata: Metadata = { title: "Admin · Experiences" };

export default async function AdminExperiencesPage() {
  const experiences = await adminListExperiences();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Experiences</h1>
        <Link
          href="/admin/experiences/new"
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
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                Vendor
              </th>
              <th className="px-4 py-2.5 text-right font-medium">Price</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {experiences.map((e) => (
              <tr key={e.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.categories.join(", ")}
                  </p>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {e.vendor.name}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatMYR(e.pricePerPerson)}
                </td>
                <td className="px-4 py-3">
                  <form action={toggleExperiencePublished}>
                    <input type="hidden" name="id" value={e.id} />
                    <input
                      type="hidden"
                      name="next"
                      value={(!e.isPublished).toString()}
                    />
                    <button
                      type="submit"
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        e.isPublished
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {e.isPublished ? "Live" : "Draft"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/admin/experiences/${e.id}/edit`}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <form action={deleteExperience}>
                      <input type="hidden" name="id" value={e.id} />
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
