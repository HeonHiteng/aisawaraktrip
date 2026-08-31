import Link from "next/link";
import { Compass, MapPin, Sparkles, Ticket } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Sparkles,
    title: "Tell us your trip",
    body: "Dates, budget, who's travelling, and what you love — nature, food, culture, adventure.",
  },
  {
    icon: Compass,
    title: "Get an AI itinerary",
    body: "A day-by-day plan built only from real, verified Sarawak attractions and local operators.",
  },
  {
    icon: Ticket,
    title: "Book & pay securely",
    body: "Reserve experiences in a few taps and pay online. Your trip and bookings live in one place.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-hero text-white">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 sm:py-24 md:grid-cols-2">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
              <MapPin className="size-3.5" />
              Kuching &amp; Sarawak, Malaysian Borneo
            </span>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Your personalized Sarawak trip, planned by AI
            </h1>
            <p className="text-pretty text-lg text-white/75">
              Describe your trip in one sentence. Get a day-by-day itinerary
              built from real attractions and verified local experiences — then
              book and pay in the same place.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/plan"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-white text-primary hover:bg-white/90",
                )}
              >
                Plan my trip
              </Link>
              <Link
                href="/explore"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white",
                )}
              >
                Browse experiences
              </Link>
            </div>
            <p className="text-xs text-white/65">
              MVP preview · attractions and vendors shown are demo data
            </p>
          </div>

          <div className="flex justify-center md:justify-end">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          One app: plan, book, explore
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                <step.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="px-4 pb-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 rounded-3xl bg-brand-gradient px-6 py-12 text-center text-white">
          <h2 className="text-2xl font-bold tracking-tight">
            Ready to plan your Borneo trip?
          </h2>
          <Link
            href="/plan"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-white text-primary hover:bg-white/90",
            )}
          >
            Start planning
          </Link>
        </div>
      </section>
    </>
  );
}
