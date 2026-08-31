import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Compass,
  Sparkles,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ExperienceCard } from "@/components/explore/experience-card";
import { requireUser, getProfile } from "@/lib/auth";
import { listExperiences } from "@/lib/domain/catalogue";
import { listTrips } from "@/lib/domain/trips";
import { listBookings } from "@/lib/domain/bookings";
import { demoCategories } from "@/lib/demo/fixtures";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TRIP_STATUS_META } from "@/types/trip";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const user = await requireUser();
  const [profile, trips, bookings, experiences] = await Promise.all([
    getProfile(),
    listTrips(user.id),
    listBookings(user.id),
    listExperiences(),
  ]);

  const name = profile?.full_name?.split(" ")[0];
  const activeTrip = trips.find(
    (t) => t.status === "draft" || t.status === "planned",
  );
  const today = new Date().toISOString().slice(0, 10);
  const nextBooking = bookings
    .filter((b) => b.status === "confirmed" && b.bookingDate >= today)
    .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate))[0];
  const featured = [...experiences]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {name ? `Hi ${name}` : "Selamat datang"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Let&apos;s plan your Kuching &amp; Sarawak trip.
        </p>
      </div>

      {/* Plan CTA */}
      <Link
        href="/plan"
        className="group block overflow-hidden rounded-2xl bg-brand-hero p-5 text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Sparkles className="size-6" />
        <p className="mt-3 text-lg font-semibold">Plan a trip with AI</p>
        <p className="mt-1 text-sm text-white/75">
          One sentence in, a day-by-day itinerary out — built from real,
          verified Sarawak places.
        </p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
          Start planning
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      {/* Continue / upcoming */}
      {(activeTrip || nextBooking) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {activeTrip && (
            <Link
              href={`/trips/${activeTrip.id}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="text-xs font-medium text-muted-foreground">
                Continue planning
              </p>
              <p className="mt-0.5 font-semibold">{activeTrip.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(activeTrip.startDate, { year: "numeric" })} ·{" "}
                {(TRIP_STATUS_META[activeTrip.status] ?? TRIP_STATUS_META.planned).label}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                Open trip
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          )}
          {nextBooking && (
            <Link
              href={`/bookings/${nextBooking.id}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <CalendarClock className="size-3.5" /> Your next experience
              </p>
              <p className="mt-0.5 font-semibold">
                {nextBooking.experienceTitle}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(nextBooking.bookingDate, { year: "numeric" })} ·{" "}
                {nextBooking.startTime}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                View booking
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Popular */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Popular in Kuching</h2>
          <Link
            href="/explore"
            className="text-xs text-primary hover:underline"
          >
            See all
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {featured.map((e) => (
            <ExperienceCard key={e.id} experience={e} />
          ))}
        </div>
      </section>

      {/* Browse by interest */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Browse by interest</h2>
        <div className="flex flex-wrap gap-2">
          {demoCategories.map((c) => (
            <Link
              key={c.slug}
              href={`/explore?cat=${c.slug}`}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {c.name}
            </Link>
          ))}
        </div>
        <Link
          href="/explore"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-1",
          )}
        >
          <Compass className="size-4" />
          Explore everything
        </Link>
      </section>
    </div>
  );
}
