import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { CoverImage } from "@/components/explore/cover-image";
import { SampleBadge } from "@/components/common/sample-badge";
import { formatDuration, formatMYR } from "@/lib/format";
import type { Attraction } from "@/types/catalogue";

function price(a: Attraction) {
  if (a.isFree || (a.priceMin === 0 && a.priceMax === 0)) return "Free entry";
  if (a.priceMin === a.priceMax) return formatMYR(a.priceMin);
  return `${formatMYR(a.priceMin)}–${formatMYR(a.priceMax)}`;
}

export function AttractionCard({ attraction }: { attraction: Attraction }) {
  const img = attraction.images[0];
  return (
    <Link
      href={`/explore/attractions/${attraction.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float"
    >
      <div className="relative h-44 w-full bg-muted">
        <CoverImage
          url={img?.url}
          alt={img?.alt ?? attraction.name}
          category={attraction.categories[0]}
          seed={attraction.slug}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute bottom-3 right-3 text-sm font-bold text-white">
          {price(attraction)}
        </span>
        {attraction.isSample && <SampleBadge />}
      </div>
      <div className="space-y-2.5 p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug">
          {attraction.name}
        </h3>
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
      </div>
    </Link>
  );
}
