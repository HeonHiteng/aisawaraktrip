import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Check,
  Clock,
  Languages,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CoverImage } from "@/components/explore/cover-image";
import { SampleBadge } from "@/components/common/sample-badge";
import { Avatar } from "@/components/common/avatar";
import { CategoryBadges } from "@/components/explore/category-badges";
import { Stars } from "@/components/reviews/stars";
import { ReviewList } from "@/components/reviews/review-list";
import { ReviewForm } from "@/components/reviews/review-form";
import { getUser } from "@/lib/auth";
import { getExperience } from "@/lib/domain/catalogue";
import { canReview, listReviews, ratingSummary } from "@/lib/domain/reviews";
import { formatDays, formatDuration, formatMYR } from "@/lib/format";

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
  const [summary, reviews, user] = await Promise.all([
    ratingSummary(exp.id),
    listReviews(exp.id),
    getUser(),
  ]);
  const reviewGate = user
    ? await canReview(user.id, exp.id)
    : ({ ok: false, reason: "Sign in and book to leave a review." } as const);

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
        <h1 className="text-2xl font-bold leading-tight">{exp.title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" />
            {exp.location?.name ?? "Sarawak"}
          </span>
          {summary.count > 0 && (
            <a
              href="#reviews"
              className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
            >
              <Stars value={summary.average} size="size-3.5" />
              {summary.average.toFixed(1)}
              <span className="font-normal text-muted-foreground">
                ({summary.count} review{summary.count === 1 ? "" : "s"})
              </span>
            </a>
          )}
        </div>
      </div>

      {/* at a glance */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Glance icon={Clock} label="Duration">
          {formatDuration(exp.durationMinutes)}
        </Glance>
        <Glance icon={Users} label="Group size">
          {exp.minPax}–{exp.maxPax}
        </Glance>
        <Glance icon={Languages} label="Languages">
          {exp.languages.join(", ")}
        </Glance>
        <Glance icon={CalendarClock} label="Runs">
          {formatDays(exp.availability.days)}
        </Glance>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
        <Avatar
          name={exp.vendor.name}
          src={exp.vendor.avatarUrl}
          className="size-9"
        />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">{exp.vendor.name}</p>
          <p className="text-xs text-muted-foreground">
            {exp.vendor.verificationStatus === "verified"
              ? "Verified local vendor"
              : "Local vendor"}
          </p>
        </div>
        {exp.vendor.verificationStatus === "verified" && (
          <BadgeCheck className="size-5 text-primary" />
        )}
      </div>

      <CategoryBadges categories={exp.categories} />

      <section>
        <h2 className="text-base font-semibold">About this experience</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
          {exp.description}
        </p>
      </section>

      {exp.includes.length > 0 && (
        <section>
          <h2 className="text-base font-semibold">What&apos;s included</h2>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {exp.includes.map((i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {i}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl bg-muted/50 p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <ShieldCheck className="size-4 text-primary" />
          Good to know
        </h2>
        <dl className="mt-2 space-y-1.5 text-sm">
          {exp.meetingPoint && (
            <div>
              <dt className="text-xs text-muted-foreground">Meeting point</dt>
              <dd>{exp.meetingPoint}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Times</dt>
            <dd>{exp.availability.times.join(", ")}</dd>
          </div>
          {exp.cancellationPolicy && (
            <div>
              <dt className="text-xs text-muted-foreground">Cancellation</dt>
              <dd>{exp.cancellationPolicy}</dd>
            </div>
          )}
        </dl>
      </section>

      <section id="reviews" className="scroll-mt-20 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">Traveller reviews</h2>
          {summary.count > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Stars value={summary.average} size="size-4" />
              <span className="font-semibold">{summary.average.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({summary.count})
              </span>
            </span>
          )}
        </div>

        {reviewGate.ok ? (
          <ReviewForm experienceId={exp.id} slug={exp.slug} />
        ) : (
          <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {reviewGate.reason}
          </p>
        )}

        <ReviewList reviews={reviews} />
      </section>

      {/* Sticky booking bar */}
      <div className="sticky bottom-20 z-30 -mx-4 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <p className="text-sm">
            <span className="text-lg font-bold">
              {formatMYR(exp.pricePerPerson)}
            </span>
            <span className="text-muted-foreground"> /person</span>
          </p>
          <Link
            href={`/book/${exp.id}`}
            className={buttonVariants({ variant: "brand", size: "lg" })}
          >
            Book now
          </Link>
        </div>
      </div>
    </div>
  );
}

function Glance({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium">{children}</p>
    </div>
  );
}
