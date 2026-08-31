import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { CoverImage } from "@/components/explore/cover-image";
import { formatDuration, formatMYR } from "@/lib/format";
import type { Attraction } from "@/types/catalogue";

function price(a: Attraction) {
  if (a.isFree || (a.priceMin === 0 && a.priceMax === 0)) return "Free";
  if (a.priceMin === a.priceMax) return formatMYR(a.priceMin);
  return `${formatMYR(a.priceMin)}–${formatMYR(a.priceMax)}`;
}

export function AttractionCard({ attraction }: { attraction: Attraction }) {
  const img = attraction.images[0];
  return (
    <Link
      href={`/explore/attractions/${attraction.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="relative h-40 w-full bg-muted">
        <CoverImage
          url={img?.url}
          alt={img?.alt ?? attraction.name}
          category={attraction.categories[0]}
          seed={attraction.slug}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {attraction.isSample && (
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[10px] font-medium text-white">
            Sample data
          </span>
        )}
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-semibold leading-snug">{attraction.name}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {attraction.location?.name ?? "Sarawak"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatDuration(attraction.avgVisitMinutes)}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {attraction.summary}
        </p>
        <p className="pt-1 text-sm font-semibold">{price(attraction)}</p>
      </div>
    </Link>
  );
}
