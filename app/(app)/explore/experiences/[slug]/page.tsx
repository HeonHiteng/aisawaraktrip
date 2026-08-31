import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Check,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CoverImage } from "@/components/explore/cover-image";
import { SampleBadge } from "@/components/common/sample-badge";
import { Rating } from "@/components/explore/rating";
import { CategoryBadges } from "@/components/explore/category-badges";
import { getExperience } from "@/lib/domain/catalogue";
import { formatDays, formatDuration, formatMYR } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/explore/experiences/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const exp = await getExperience(slug);
  return { title: exp?.title ?? "Experience" };
}

export default async function ExperiencePage({
  params,
}: PageProps<"/explore/experiences/[slug]">) {
  const { slug } = await params;
  const exp = await getExperience(slug);
  if (!exp) notFound();

  const img = exp.images[0];

  return (
    <div className="space-y-5">
      <Link
        href="/explore"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Explore
      </Link>

      <div className="relative h-60 w-full overflow-hidden rounded-2xl bg-muted sm:h-72">
        <CoverImage
          url={img?.url}
          alt={img?.alt ?? exp.title}
          category={exp.categories[0]}
          seed={exp.slug}
          priority
        />
        {exp.isSample && <SampleBadge />}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight tracking-tight">
          {exp.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" />
            {exp.location?.name ?? "Sarawak"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" />
            {formatDuration(exp.durationMinutes)}
          </span>
          <Rating value={exp.rating} count={exp.reviewCount} />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
        {exp.vendor.verificationStatus === "verified" && (
          <BadgeCheck className="size-5 text-primary" />
        )}
        <span className="font-medium">{exp.vendor.name}</span>
        <span className="text-muted-foreground">· Verified local vendor</span>
      </div>

      <CategoryBadges categories={exp.categories} />

      <p className="text-sm leading-relaxed text-foreground/90">
        {exp.description}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Users className="size-3.5" /> Group size
          </p>
          <p className="mt-1 text-sm">
            {exp.minPax}–{exp.maxPax} people
          </p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarClock className="size-3.5" /> Availability
          </p>
          <p className="mt-1 text-sm">
            {formatDays(exp.availability.days)} · {exp.availability.times.join(", ")}
          </p>
        </div>
      </div>

      {exp.includes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold">What&apos;s included</h2>
          <ul className="mt-2 space-y-1">
            {exp.includes.map((i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {i}
              </li>
            ))}
          </ul>
        </div>
      )}

      {exp.meetingPoint && (
        <p className="text-sm">
          <span className="font-semibold">Meeting point: </span>
          <span className="text-muted-foreground">{exp.meetingPoint}</span>
        </p>
      )}
      {exp.cancellationPolicy && (
        <p className="text-sm text-muted-foreground">{exp.cancellationPolicy}</p>
      )}

      {/* Sticky booking bar */}
      <div className="sticky bottom-20 z-30 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <p className="text-sm">
            <span className="font-semibold">
              {formatMYR(exp.pricePerPerson)}
            </span>
            <span className="text-muted-foreground"> /person</span>
          </p>
          <Link
            href={`/book/${exp.id}`}
            className={cn(buttonVariants(), "bg-brand-gradient text-white")}
          >
            Book now
          </Link>
        </div>
      </div>
    </div>
  );
}
