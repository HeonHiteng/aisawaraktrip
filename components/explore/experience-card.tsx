import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { CoverImage } from "@/components/explore/cover-image";
import { SampleBadge } from "@/components/common/sample-badge";
import { Avatar } from "@/components/common/avatar";
import { formatMYR } from "@/lib/format";
import type { Experience } from "@/types/catalogue";

export function ExperienceCard({ experience }: { experience: Experience }) {
  const img = experience.images[0];
  const verified = experience.vendor.verificationStatus === "verified";

  return (
    <Link
      href={`/explore/experiences/${experience.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float"
    >
      <div className="relative h-44 w-full bg-muted">
        <CoverImage
          url={img?.url}
          alt={img?.alt ?? experience.title}
          category={experience.categories[0]}
          seed={experience.slug}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        {/* legibility scrim */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

        {verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <BadgeCheck className="size-3.5" />
            Verified
          </span>
        )}
        {experience.rating != null && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-neutral-900">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            {experience.rating.toFixed(1)}
          </span>
        )}
        {experience.isSample && <SampleBadge />}

        <p className="absolute bottom-3 right-3 text-right text-white">
          <span className="text-[11px] opacity-80">from </span>
          <span className="text-base font-bold">
            {formatMYR(experience.pricePerPerson)}
          </span>
        </p>
      </div>

      <div className="space-y-2.5 p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug">
          {experience.title}
        </h3>

        <div className="flex items-center gap-2">
          <Avatar
            name={experience.vendor.name}
            src={experience.vendor.avatarUrl}
            className="size-6"
          />
          <span className="truncate text-xs text-muted-foreground">
            {experience.vendor.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          {experience.location?.name ?? "Sarawak"}
          <span className="text-border">·</span>
          {experience.reviewCount} reviews
        </div>
      </div>
    </Link>
  );
}
