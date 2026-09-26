"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { demoCategories } from "@/lib/demo/fixtures";
import { CITIES, DISH_LABELS } from "@/types/eatery";

const tabs = [
  { value: "experiences", label: "Experiences" },
  { value: "attractions", label: "Attractions" },
  { value: "food", label: "Food" },
] as const;

export function ExploreControls() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const rawTab = params.get("tab");
  const tab = rawTab === "attractions" || rawTab === "food" ? rawTab : "experiences";
  const city = params.get("city") ?? "";
  const dish = params.get("dish") ?? "";
  const activeCats = (params.get("cat") ?? "").split(",").filter(Boolean);
  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "recommended";

  // The query the page is heading to. Two quick taps must both count: the second one builds on the
  // first even if the first navigation hasn't finished (and `params` hasn't caught up) yet.
  const latest = useRef(params.toString());
  useEffect(() => {
    latest.current = params.toString();
  }, [params]);

  const update = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(latest.current);
      for (const [k, v] of Object.entries(next)) {
        if (v) sp.set(k, v);
        else sp.delete(k);
      }
      latest.current = sp.toString();
      startTransition(() => router.replace(`${pathname}?${sp.toString()}`));
    },
    [pathname, router],
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
          type="search"
          aria-label="Search experiences, places and food"
          defaultValue={q}
          placeholder="Search experiences, places, food…"
          className="pl-9"
          onChange={(e) => update({ q: e.target.value || null })}
        />
      </div>

      <div
        role="tablist"
        aria-label="Browse experiences, attractions or food"
        className="flex gap-1 rounded-full bg-muted p-1"
      >
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() =>
              // switching tabs drops the filters of the other tabs
              update({ tab: t.value === "experiences" ? null : t.value, cat: null, city: null, dish: null, sort: null })
            }
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === t.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "food" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="City">
                <button
                  type="button"
                  aria-pressed={!city}
                  onClick={() => update({ city: null })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !city
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  All cities
                </button>
            {CITIES.map((c) => (
              <span key={c}>
                <button
                  type="button"
                  aria-pressed={city === c}
                  onClick={() => update({ city: city === c ? null : c })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    city === c
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Dish">
            {Object.entries(DISH_LABELS).map(([slug, label]) => (
              <span key={slug}>
                <button
                  type="button"
                  aria-pressed={dish === slug}
                  onClick={() => update({ dish: dish === slug ? null : slug })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    dish === slug
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {tab !== "food" && (
        <>
          <div className="flex flex-wrap gap-2">
            {demoCategories.map((c) => {
              const on = activeCats.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCat(c.slug)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
    
          <div className="flex justify-end">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Sort
              <select
                aria-label="Sort results"
                value={sort}
                onChange={(e) =>
                  update({
                    sort: e.target.value === "recommended" ? null : e.target.value,
                  })
                }
                className="h-8 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="recommended">Recommended</option>
                {tab === "experiences" && (
                  <option value="rating-desc">Top rated</option>
                )}
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </label>
          </div>
        </>
      )}
    </div>
  );
}
