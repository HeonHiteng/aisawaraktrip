import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Clock, MapPin } from "lucide-react";
import { BookingForm } from "@/components/booking/booking-form";
import { getExperienceById } from "@/lib/domain/catalogue";
import { getProfile, getUser } from "@/lib/auth";
import { formatDuration, formatMYR } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/book/[experienceId]">): Promise<Metadata> {
  const { experienceId } = await params;
  const exp = await getExperienceById(experienceId);
  return { title: exp ? `Book ${exp.title}` : "Book" };
}

export default async function BookPage({
  params,
  searchParams,
}: PageProps<"/book/[experienceId]">) {
  const { experienceId } = await params;
  const sp = await searchParams;
  const tripId = typeof sp.trip === "string" ? sp.trip : null;

  const [exp, user, profile] = await Promise.all([
    getExperienceById(experienceId),
    getUser(),
    getProfile(),
  ]);
  if (!exp) notFound();

  return (
    <div className="space-y-5">
      <Link
        href={`/explore/experiences/${exp.slug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h1 className="font-semibold leading-snug">{exp.title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BadgeCheck className="size-3.5 text-primary" />
            {exp.vendor.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {exp.location?.name ?? "Sarawak"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatDuration(exp.durationMinutes)}
          </span>
        </div>
        <p className="mt-2 text-sm">
          <span className="font-semibold">{formatMYR(exp.pricePerPerson)}</span>
          <span className="text-muted-foreground"> per person</span>
        </p>
      </div>

      <BookingForm
        experienceId={exp.id}
        tripId={tripId}
        unitPrice={exp.pricePerPerson}
        minPax={exp.minPax}
        maxPax={exp.maxPax}
        availableDays={exp.availability.days}
        times={exp.availability.times}
        leadtimeHours={exp.bookingLeadtimeHours}
        defaultName={profile?.full_name ?? ""}
        defaultEmail={user?.email ?? ""}
        defaultPhone={profile?.phone ?? ""}
      />
    </div>
  );
}
