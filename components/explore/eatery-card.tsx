import { ExternalLink, MapPin, Sparkles } from "lucide-react";
import { dishLabel, PRICE_TIER_HINT, PRICE_TIER_LABEL, type Eatery } from "@/types/eatery";

/** One place in the local food guide. The "Maps" link opens Google Maps in a new tab. */
export function EateryCard({ eatery }: { eatery: Eatery }) {
  return (
    <article className="flex h-full flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-card">
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
    </article>
  );
}
