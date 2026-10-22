import { ExternalLink, MapPin, Sparkles } from "lucide-react";
import { CARD_SIZES, CoverImage } from "@/components/explore/cover-image";
import { eateryPhoto } from "@/lib/photo-credits";
import { dishLabel, PRICE_TIER_HINT, PRICE_TIER_LABEL, type Eatery } from "@/types/eatery";

/**
 * One place in the local food guide. The photo shows its signature dish (the first listed dish
 * with a real photo; branded food art otherwise). The "Maps" link opens Google Maps in a new tab.
 */
/** `priority`: the first card on screen — load its photo eagerly (it is the page's largest paint). */
export function EateryCard({ eatery, priority }: { eatery: Eatery; priority?: boolean }) {
  const photo = eateryPhoto(eatery.dishes);
  const dish = eatery.dishes[0];
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="relative h-32 w-full bg-muted">
        <CoverImage
          url={photo}
          alt={dish ? `${dishLabel(dish)} at ${eatery.name}` : eatery.name}
          category="food"
          seed={eatery.name}
          sizes={CARD_SIZES}
          priority={priority}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{eatery.name}</h3>
          {eatery.priceTier ? (
            <span
              className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold"
              title={PRICE_TIER_HINT[eatery.priceTier]}
            >
              <span aria-hidden>{PRICE_TIER_LABEL[eatery.priceTier]}</span>
              <span className="sr-only">{PRICE_TIER_HINT[eatery.priceTier]} price</span>
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {eatery.city}
          </span>
          {eatery.isSplurge && (
            <span className="inline-flex items-center gap-1 font-medium text-amber-800 dark:text-amber-400">
              <Sparkles className="size-3.5" aria-hidden />
              Splurge
            </span>
          )}
        </div>

        {eatery.dishes.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="What to eat">
            {eatery.dishes.map((d) => (
              <li key={d} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {dishLabel(d)}
              </li>
            ))}
          </ul>
        )}

        {eatery.notes && <p className="text-sm text-muted-foreground">{eatery.notes}</p>}

        {eatery.mapsUrl && (
          <a
            href={eatery.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary hover:underline"
          >
            Open in Maps
            <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only"> ({eatery.name}, opens in a new tab)</span>
          </a>
        )}
      </div>
    </article>
  );
}
