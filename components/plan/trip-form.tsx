"use client";

import { useActionState, useState } from "react";
import { MapPin, Minus, Plus, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { demoCategories } from "@/lib/demo/fixtures";
import { parseTripPrompt } from "@/lib/plan/parse-prompt";
import { GeneratingOverlay } from "@/components/plan/generating-overlay";
import { generateTrip, type PlanState } from "@/app/(app)/plan/actions";
import type { CategorySlug } from "@/types/catalogue";
import type { GroupType, TripPace } from "@/types/trip";

const GROUP_TYPES: { value: GroupType; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "couple", label: "Couple" },
  { value: "family", label: "Family" },
  { value: "friends", label: "Friends" },
  { value: "business", label: "Business" },
];

const PACES: { value: TripPace; label: string }[] = [
  { value: "relaxed", label: "Relaxed" },
  { value: "moderate", label: "Balanced" },
  { value: "packed", label: "Packed" },
];

const BUDGETS = [
  { value: "800", label: "Budget", sub: "~RM800" },
  { value: "1500", label: "Comfort", sub: "~RM1,500" },
  { value: "3000", label: "Premium", sub: "~RM3,000" },
];

function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

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

  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("My Sarawak trip");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [budget, setBudget] = useState("1500");
  const [groupType, setGroupType] = useState<GroupType>("couple");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [interests, setInterests] = useState<Set<CategorySlug>>(
    new Set(["food", "nature", "culture"]),
  );
  const [pace, setPace] = useState<TripPace>("moderate");
  const [notes, setNotes] = useState("");
  const [applied, setApplied] = useState(false);

  function toggleInterest(slug: CategorySlug) {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function applyPrompt() {
    const p = parseTripPrompt(prompt);
    if (p.days) setEndDate(addDays(startDate, p.days - 1));
    if (p.budgetPerPerson) setBudget(String(p.budgetPerPerson));
    if (p.groupType) setGroupType(p.groupType);
    if (p.numAdults) setAdults(p.numAdults);
    if (p.numChildren != null) setChildren(p.numChildren);
    if (p.interests?.length) setInterests(new Set(p.interests));
    if (p.pace) setPace(p.pace);
    setApplied(true);
  }

  return (
    <>
      {pending && <GeneratingOverlay />}

      <form action={action} className="space-y-5">
        {/* Conversational entry */}
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Wand2 className="size-4 text-primary" />
            Describe your trip
          </p>
          <Textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setApplied(false);
            }}
            rows={2}
            placeholder="3 days in Kuching, RM1,500, couple, into food + nature"
            className="mt-2 bg-background"
            disabled={pending}
          />
          <div className="mt-2 flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={applyPrompt}
              disabled={pending || prompt.trim().length < 4}
            >
              Fill in the form
            </Button>
            {applied && (
              <span className="text-xs text-primary">
                Filled below — tweak anything, then generate.
              </span>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="space-y-4 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Trip name</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
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
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  disabled={pending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Budget per person</Label>
              <div className="flex gap-2">
                {BUDGETS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    aria-pressed={budget === b.value}
                    onClick={() => setBudget(b.value)}
                    disabled={pending}
                    className={cn(
                      "flex-1 rounded-xl border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      budget === b.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    <span className="block text-xs font-medium">{b.label}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {b.sub}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">or MYR</span>
                <Input
                  name="budgetPerPerson"
                  type="number"
                  min={0}
                  step={100}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="h-8 max-w-32"
                  disabled={pending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="groupType">Group</Label>
                <select
                  id="groupType"
                  name="groupType"
                  value={groupType}
                  onChange={(e) => setGroupType(e.target.value as GroupType)}
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
                <Stepper
                  label="Adults"
                  value={adults}
                  min={1}
                  onChange={setAdults}
                  disabled={pending}
                />
                <Stepper
                  label="Children"
                  value={children}
                  min={0}
                  onChange={setChildren}
                  disabled={pending}
                />
              </div>
            </div>
            <input type="hidden" name="numAdults" value={adults} />
            <input type="hidden" name="numChildren" value={children} />

            <div className="space-y-2">
              <Label>What interests you?</Label>
              <div className="flex flex-wrap gap-2">
                {demoCategories.map((c) => {
                  const on = interests.has(c.slug);
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleInterest(c.slug)}
                      disabled={pending}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        on
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
              {[...interests].map((s) => (
                <input key={s} type="hidden" name="interests" value={s} />
              ))}
            </div>

            <div className="space-y-2">
              <Label>Pace</Label>
              <div className="flex gap-2">
                {PACES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={pace === p.value}
                    onClick={() => setPace(p.value)}
                    disabled={pending}
                    className={cn(
                      "flex-1 rounded-full border px-3 py-1.5 text-center text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      pace === p.value
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="pace" value={pace} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Anything else? (optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
    </>
  );
}

function Stepper({
  label,
  value,
  min,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          className="grid size-8 place-items-center rounded-full border border-border disabled:opacity-40"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="w-5 text-center text-sm font-medium tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(20, value + 1))}
          disabled={disabled || value >= 20}
          className="grid size-8 place-items-center rounded-full border border-border disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
