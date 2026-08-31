import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { CoverImage } from "@/components/explore/cover-image";
import { Rating } from "@/components/explore/rating";
import { formatMYR } from "@/lib/format";
import type { Experience } from "@/types/catalogue";

export function ExperienceCard({ experience }: { experience: Experience }) {
  const img = experience.images[0];
  const verified = experience.vendor.verificationStatus === "verified";

  return (
    <Link
      href={`/explore/experiences/${experience.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="relative h-40 w-full bg-muted">
        <CoverImage
          url={img?.url}
          alt={img?.alt ?? experience.title}
          category={experience.categories[0]}
          seed={experience.slug}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand-gradient px-2 py-1 text-[11px] font-semibold text-white">
            <BadgeCheck className="size-3.5" />
            Verified
          </span>
        )}
        {experience.isSample && (
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[10px] font-medium text-white">
            Sample data
          </span>
        )}
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{experience.title}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {experience.location?.name ?? "Sarawak"}
          </span>
          <Rating value={experience.rating} count={experience.reviewCount} />
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {experience.summary}
        </p>

        <div className="flex items-end justify-between pt-1">
          <p className="text-sm">
            <span className="text-muted-foreground">from </span>
            <span className="font-semibold">
              {formatMYR(experience.pricePerPerson)}
            </span>
            <span className="text-muted-foreground"> /person</span>
          </p>
          <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            View
          </span>
        </div>
      </div>
    </Link>
  );
}
