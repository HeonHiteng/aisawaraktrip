import { demoCategories } from "@/lib/demo/fixtures";
import type { CategorySlug } from "@/types/catalogue";

const NAME = new Map(demoCategories.map((c) => [c.slug, c.name]));

export function CategoryBadges({ categories }: { categories: CategorySlug[] }) {
  if (!categories.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((c) => (
        <span
          key={c}
          className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
        >
          {NAME.get(c) ?? c}
        </span>
      ))}
    </div>
  );
}
