"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { demoCategories } from "@/lib/demo/fixtures";

const tabs = [
  { value: "experiences", label: "Experiences" },
  { value: "attractions", label: "Attractions" },
] as const;

export function ExploreControls() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const tab = params.get("tab") === "attractions" ? "attractions" : "experiences";
  const activeCats = (params.get("cat") ?? "").split(",").filter(Boolean);
  const q = params.get("q") ?? "";

  const update = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v) sp.set(k, v);
        else sp.delete(k);
      }
      startTransition(() => router.replace(`${pathname}?${sp.toString()}`));
    },
    [params, pathname, router],
  );

  const toggleCat = (slug: string) => {
    const set = new Set(activeCats);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    update({ cat: [...set].join(",") || null });
  };

  return (
    <div className={cn("space-y-3", pending && "opacity-70")}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={q}
          placeholder="Search experiences, places…"
          className="pl-9"
          onChange={(e) => update({ q: e.target.value || null })}
        />
      </div>

      <div className="flex gap-1 rounded-full bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => update({ tab: t.value === "experiences" ? null : t.value })}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {demoCategories.map((c) => {
          const on = activeCats.includes(c.slug);
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => toggleCat(c.slug)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                on
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
