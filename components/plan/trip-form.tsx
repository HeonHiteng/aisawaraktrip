"use client";

import { useActionState } from "react";
import { MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { demoCategories } from "@/lib/demo/fixtures";
import { generateTrip, type PlanState } from "@/app/(app)/plan/actions";

const GROUP_TYPES = [
  { value: "solo", label: "Solo" },
  { value: "couple", label: "Couple" },
  { value: "family", label: "Family" },
  { value: "friends", label: "Friends" },
  { value: "business", label: "Business" },
];

const PACES = [
  { value: "relaxed", label: "Relaxed" },
  { value: "moderate", label: "Balanced" },
  { value: "packed", label: "Packed" },
];

export function TripForm({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string;
  defaultEnd: string;
}) {
  const [state, action, pending] = useActionState<PlanState, FormData>(
    generateTrip,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="bg-brand-hero px-5 py-4 text-white">
          <p className="text-[11px] font-semibold tracking-widest text-white/70">
            PLAN YOUR TRIP WITH AI
          </p>
          <p className="mt-0.5 text-sm text-white/85">
            Tell us the essentials — we&apos;ll build a day-by-day plan from real
            Sarawak places.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Trip name</Label>
            <Input
              id="title"
              name="title"
              defaultValue="My Sarawak trip"
              maxLength={80}
              disabled={pending}
            />
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2 text-sm">
            <MapPin className="size-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground">Destination</p>
              <p className="font-semibold">Kuching &amp; Sarawak</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={defaultStart}
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={defaultEnd}
                required
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budgetPerPerson">Budget per person (MYR)</Label>
            <Input
              id="budgetPerPerson"
              name="budgetPerPerson"
              type="number"
              min={0}
              step={100}
              placeholder="1500"
              inputMode="numeric"
              disabled={pending}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="groupType">Group</Label>
              <select
                id="groupType"
                name="groupType"
                defaultValue="couple"
                disabled={pending}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {GROUP_TYPES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="numAdults">Adults</Label>
                <Input
                  id="numAdults"
                  name="numAdults"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={2}
                  disabled={pending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numChildren">Children</Label>
                <Input
                  id="numChildren"
                  name="numChildren"
                  type="number"
                  min={0}
                  max={20}
                  defaultValue={0}
                  disabled={pending}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>What interests you?</Label>
            <div className="flex flex-wrap gap-2">
              {demoCategories.map((c) => (
                <label
                  key={c.slug}
                  className={cn(
                    "cursor-pointer select-none rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    "border-border text-muted-foreground hover:bg-accent",
                    "has-[:checked]:border-transparent has-[:checked]:bg-primary has-[:checked]:text-primary-foreground",
                  )}
                >
                  <input
                    type="checkbox"
                    name="interests"
                    value={c.slug}
                    defaultChecked={["food", "nature", "culture"].includes(
                      c.slug,
                    )}
                    className="sr-only"
                    disabled={pending}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pace</Label>
            <div className="flex gap-2">
              {PACES.map((p, i) => (
                <label
                  key={p.value}
                  className={cn(
                    "flex-1 cursor-pointer select-none rounded-full border px-3 py-1.5 text-center text-xs font-medium transition-colors",
                    "border-border text-muted-foreground hover:bg-accent",
                    "has-[:checked]:border-transparent has-[:checked]:bg-primary has-[:checked]:text-primary-foreground",
                  )}
                >
                  <input
                    type="radio"
                    name="pace"
                    value={p.value}
                    defaultChecked={i === 1}
                    className="sr-only"
                    disabled={pending}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Anything else? (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              maxLength={500}
              placeholder="Travelling with grandparents, love photography, no seafood…"
              disabled={pending}
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-brand-gradient text-white"
        size="lg"
      >
        <Sparkles className="size-4" />
        {pending ? "Building your itinerary…" : "Generate my trip"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        The plan only uses real, verified Sarawak attractions and experiences.
      </p>
    </form>
  );
}
