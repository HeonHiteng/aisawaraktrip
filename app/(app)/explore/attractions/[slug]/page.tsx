import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Ticket } from "lucide-react";
import { CategoryBadges } from "@/components/explore/category-badges";
import { CoverImage } from "@/components/explore/cover-image";
import { SampleBadge } from "@/components/common/sample-badge";
import { getAttraction } from "@/lib/domain/catalogue";
import { formatDuration, formatMYR } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/explore/attractions/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const att = await getAttraction(slug);
  return { title: att?.name ?? "Attraction" };
}

function priceLabel(min: number, max: number, free: boolean) {
  if (free || (min === 0 && max === 0)) return "Free entry";
  if (min === max) return formatMYR(min);
  return `${formatMYR(min)}–${formatMYR(max)}`;
}

export default async function AttractionPage({
  params,
}: PageProps<"/explore/attractions/[slug]">) {
  const { slug } = await params;
  const att = await getAttraction(slug);
  if (!att) notFound();

  const img = att.images[0];
  const hours = Object.entries(att.openingHours);

  return (
    <div className="space-y-5">
      <Link
        href="/explore?tab=attractions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Explore
      </Link>

      <div className="relative h-60 w-full overflow-hidden rounded-2xl bg-muted sm:h-72">
        <CoverImage
          url={img?.url}
          alt={img?.alt ?? att.name}
          category={att.categories[0]}
          seed={att.slug}
          priority
        />
        {att.isSample && <SampleBadge />}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight tracking-tight">
          {att.name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" />
            {att.location?.name ?? "Sarawak"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" />
            {formatDuration(att.avgVisitMinutes)} typical visit
          </span>
          <span className="inline-flex items-center gap-1">
            <Ticket className="size-4" />
            {priceLabel(att.priceMin, att.priceMax, att.isFree)}
          </span>
        </div>
      </div>

      <CategoryBadges categories={att.categories} />

      <p className="text-sm leading-relaxed text-foreground/90">
        {att.description}
      </p>

      {hours.length > 0 && (
        <div className="rounded-xl border border-border p-3">
          <p className="text-sm font-semibold">Opening hours</p>
          <dl className="mt-2 space-y-1 text-sm">
            {hours.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="capitalize text-muted-foreground">
                  {k.replace(/_/g, "–")}
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {att.address && (
        <p className="text-sm">
          <span className="font-semibold">Address: </span>
          <span className="text-muted-foreground">{att.address}</span>
        </p>
      )}
      {att.tips && (
        <div className="rounded-xl bg-accent p-3 text-sm text-accent-foreground">
          <span className="font-semibold">Tip: </span>
          {att.tips}
        </div>
      )}
    </div>
  );
}
