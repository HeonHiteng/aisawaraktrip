import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  Compass,
  Map as MapIcon,
  Sparkles,
  Utensils,
} from "lucide-react";
import { ExperienceCard } from "@/components/explore/experience-card";
import { AttractionCard } from "@/components/explore/attraction-card";
import { CATEGORY_ICON } from "@/components/explore/category-icon";
import { Rail, RailItem } from "@/components/common/rail";
import { requireUser, getProfile } from "@/lib/auth";
import { listAttractions, listExperiences } from "@/lib/domain/catalogue";
import { listEateries } from "@/lib/domain/eateries";
import { listTrips } from "@/lib/domain/trips";
import { listBookings } from "@/lib/domain/bookings";
import { demoCategories } from "@/lib/demo/fixtures";
import { PROMPT_STARTERS } from "@/lib/plan/starters";
import { formatDate } from "@/lib/format";
import { isMustSee } from "@/types/catalogue";
import { TRIP_STATUS_META } from "@/types/trip";

export const metadata: Metadata = { title: "Home" };

const CARD_LINK =
  "group flex rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function HomePage() {
  const user = await requireUser();
  const [profile, trips, bookings, experiences, attractions, eateries] =
    await Promise.all([
      getProfile(),
      listTrips(user.id),
      listBookings(user.id),
      listExperiences(),
      listAttractions(),
      listEateries(),
    ]);

  const name = profile?.full_name?.split(" ")[0];
  const activeTrip = trips.find(
    (t) => t.status === "draft" || t.status === "planned",
  );
  const today = new Date().toISOString().slice(0, 10);
  const nextBooking = bookings
    .filter((b) => b.status === "confirmed" && b.bookingDate >= today)
    .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate))[0];
  const mustSee = attractions
    .filter((a) => isMustSee(a.featuredRank))
    .sort((a, b) => (a.featuredRank ?? 99) - (b.featuredRank ?? 99));
  const popular = [...experiences]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {name ? `Hi ${name}` : "Selamat datang"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Let&apos;s plan your Kuching &amp; Sarawak trip.
        </p>
      </div>

      {/* Planner hero: one tap into the planner, or a quick start that pre-fills it */}
      <section
        aria-labelledby="plan-hero"
        className="relative overflow-hidden rounded-3xl bg-brand-hero p-5 text-white"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-white/10 blur-2xl"
        />
        <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">
          AI trip planner
        </p>
        <h2 id="plan-hero" className="mt-1 text-xl font-bold tracking-tight">
          Tell us your trip in one sentence
        </h2>
        <p className="mt-1 text-sm text-white/75">
          You get a day-by-day plan built from real, verified Sarawak places.
        </p>

        <Link
          href="/plan"
          className="mt-4 flex min-h-12 items-center gap-2.5 rounded-full bg-background py-1.5 pr-1.5 pl-4 text-sm text-muted-foreground shadow-float transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Sparkles aria-hidden className="size-4 shrink-0 text-primary" />
          <span className="flex-1 truncate">3 days, couple, food &amp; nature…</span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-gradient px-3.5 py-2 text-xs font-semibold text-white">
            Start planning
            <ArrowRight aria-hidden className="size-3.5" />
          </span>
        </Link>

        <p className="mt-4 text-xs font-medium text-white/70">Or start from</p>
        <ul
          aria-label="Trip ideas"
          className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {PROMPT_STARTERS.map((s) => (
            <li key={s} className="shrink-0">
              <Link
                href={`/plan?q=${encodeURIComponent(s)}`}
                className="inline-flex min-h-9 items-center rounded-full border border-white/25 bg-white/10 px-3 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {s}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Continue / upcoming */}
      {(activeTrip || nextBooking) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {activeTrip && (
            <Link
              href={`/trips/${activeTrip.id}`}
              className={`${CARD_LINK} items-center gap-3 p-4`}
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-primary"
              >
                <MapIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-muted-foreground">
                  Continue planning
                </span>
                <span className="block truncate font-semibold">
                  {activeTrip.title}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {formatDate(activeTrip.startDate, { year: "numeric" })} ·{" "}
                  {(TRIP_STATUS_META[activeTrip.status] ?? TRIP_STATUS_META.planned).label}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          )}
          {nextBooking && (
            <Link
              href={`/bookings/${nextBooking.id}`}
              className={`${CARD_LINK} items-center gap-3 p-4`}
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-primary"
              >
                <CalendarClock className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-muted-foreground">
                  Your next experience
                </span>
                <span className="block truncate font-semibold">
                  {nextBooking.experienceTitle}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {formatDate(nextBooking.bookingDate, { year: "numeric" })} ·{" "}
                  {nextBooking.startTime}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          )}
        </div>
      )}

      {mustSee.length > 0 && (
        <Rail
          title="Must-see in Kuching"
          description="The places locals say not to miss"
          href="/explore?tab=attractions"
        >
          {mustSee.map((a) => (
            <RailItem key={a.id} className="w-[13rem]">
              <AttractionCard attraction={a} compact />
            </RailItem>
          ))}
        </Rail>
      )}

      {popular.length > 0 && (
        <Rail
          title="Popular experiences"
          description="Book direct with verified local guides"
          href="/explore"
        >
          {popular.map((e, i) => (
            <RailItem key={e.id}>
              <ExperienceCard experience={e} priority={i === 0} />
            </RailItem>
          ))}
        </Rail>
      )}

      {/* Food guide teaser */}
      {eateries.length > 0 && (
        <Link
          href="/explore?tab=food"
          className={`${CARD_LINK} items-center gap-3 p-4`}
        >
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-primary"
          >
            <Utensils className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Eat like a local</span>
            <span className="block text-xs text-muted-foreground">
              {eateries.length} spots for Sarawak laksa, kolo mee and more
            </span>
          </span>
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}

      {/* Browse by interest */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Browse by interest
        </h2>
        <ul className="grid grid-cols-4 gap-2">
          {demoCategories.map((c) => {
            const Icon = CATEGORY_ICON[c.slug];
            return (
              <li key={c.slug}>
                <Link
                  href={`/explore?cat=${c.slug}`}
                  className="flex h-full flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-1 py-3 text-xs font-medium shadow-card transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    aria-hidden
                    className="grid size-9 place-items-center rounded-full bg-accent text-primary"
                  >
                    <Icon className="size-[1.125rem]" />
                  </span>
                  {c.name}
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/explore"
              className="flex h-full flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-1 py-3 text-xs font-medium shadow-card transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"
              >
                <Compass className="size-[1.125rem]" />
              </span>
              See all
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
