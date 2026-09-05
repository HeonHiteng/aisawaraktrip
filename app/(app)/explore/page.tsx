import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreControls } from "@/components/explore/explore-controls";
import { ExperienceCard } from "@/components/explore/experience-card";
import { AttractionCard } from "@/components/explore/attraction-card";
import { listAttractions, listExperiences } from "@/lib/domain/catalogue";
import type { SortOption } from "@/lib/domain/catalogue";
import type { CategorySlug } from "@/types/catalogue";

const SORTS: SortOption[] = ["recommended", "price-asc", "price-desc", "rating-desc"];

export const metadata: Metadata = { title: "Explore" };

const CATS: CategorySlug[] = [
  "nature",
  "wildlife",
  "culture",
  "heritage",
  "food",
  "adventure",
  "shopping",
];

export default async function ExplorePage({
  searchParams,
}: PageProps<"/explore">) {
  const sp = await searchParams;
  const tab = sp.tab === "attractions" ? "attractions" : "experiences";
  const search = typeof sp.q === "string" ? sp.q : undefined;
  const categories = (typeof sp.cat === "string" ? sp.cat.split(",") : [])
    .filter((c): c is CategorySlug => (CATS as string[]).includes(c));
  const sort = SORTS.includes(sp.sort as SortOption)
    ? (sp.sort as SortOption)
    : "recommended";

  const opts = { search, categories, sort };
  const experiences = tab === "experiences" ? await listExperiences(opts) : [];
  const attractions = tab === "attractions" ? await listAttractions(opts) : [];
  const count = tab === "experiences" ? experiences.length : attractions.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Explore Sarawak</h1>
        <p className="text-sm text-muted-foreground">
          Book directly with verified local vendors.
        </p>
      </div>

      <Suspense fallback={null}>
        <ExploreControls />
      </Suspense>

      <p className="text-xs text-muted-foreground">
        {count} {tab === "experiences" ? "experience" : "attraction"}
        {count === 1 ? "" : "s"}
      </p>

      {count === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nothing matches those filters yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tab === "experiences"
            ? experiences.map((e) => (
                <ExperienceCard key={e.id} experience={e} />
              ))
            : attractions.map((a) => (
                <AttractionCard key={a.id} attraction={a} />
              ))}
        </div>
      )}
    </div>
  );
}
