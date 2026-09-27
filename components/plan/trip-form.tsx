"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  SlidersHorizontal,
  Users,
  Wallet,
  Wand2,
} from "lucide-react";
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

/** A few starting points so the free-text box never faces a blank page. */
const PROMPT_STARTERS = [
  "3-day food & culture trip for a couple",
  "Weekend nature escape with kids",
  "Budget solo adventure, love hiking",
  "Relaxed family week, no hiking",
];

type Section = "dates" | "travellers" | "budget" | "fine" | null;

function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function nightsBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

/** "18–20 Oct" — a year only when the trip spans one, so the chip stays short. */
function shortDateRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const crossesYear = s.getFullYear() !== e.getFullYear();
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const sStr = s.toLocaleDateString("en-MY", opts);
  const eStr = e.toLocaleDateString("en-MY", {
    ...opts,
    year: crossesYear ? "numeric" : undefined,
  });
  return `${sStr} – ${eStr}`;
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
  const [justApplied, setJustApplied] = useState(false);
  const [openSection, setOpenSection] = useState<Section>(null);

  useEffect(() => {
    if (!justApplied) return;
    const id = setTimeout(() => setJustApplied(false), 1400);
    return () => clearTimeout(id);
  }, [justApplied]);

  function toggleSection(s: Exclude<Section, null>) {
    setOpenSection((cur) => (cur === s ? null : s));
  }

  function applyPrompt(text: string) {
    const p = parseTripPrompt(text);
    if (p.days) setEndDate(addDays(startDate, p.days - 1));
    if (p.budgetPerPerson) setBudget(String(p.budgetPerPerson));
    if (p.groupType) setGroupType(p.groupType);
    if (p.numAdults) setAdults(p.numAdults);
    if (p.numChildren != null) setChildren(p.numChildren);
    if (p.interests?.length) setInterests(new Set(p.interests));
    if (p.pace) setPace(p.pace);
    setApplied(true);
    setJustApplied(true);
  }

  function applyStarter(text: string) {
    setPrompt(text);
    setApplied(false);
    applyPrompt(text);
  }

  function toggleInterest(slug: CategorySlug) {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const nights = nightsBetween(startDate, endDate);
  const datesSummary = `${shortDateRange(startDate, endDate)} · ${nights} night${nights === 1 ? "" : "s"}`;

  const groupLabel = GROUP_TYPES.find((g) => g.value === groupType)?.label ?? "";
  const travellersSummary = `${adults} adult${adults === 1 ? "" : "s"}${
    children > 0 ? `, ${children} child${children === 1 ? "" : "ren"}` : ""
  } · ${groupLabel}`;

  const matchedBudget = BUDGETS.find((b) => b.value === budget);
  const budgetSummary = matchedBudget
    ? `${matchedBudget.sub} / person · ${matchedBudget.label}`
    : `RM${budget || 0} / person`;

  const interestNames = demoCategories
    .filter((c) => interests.has(c.slug))
    .map((c) => c.name);
  const interestsPart =
    interestNames.length === 0
      ? "No interests set"
      : interestNames.length <= 2
        ? interestNames.join(", ")
        : `${interestNames.slice(0, 2).join(", ")} +${interestNames.length - 2}`;
  const paceLabel = PACES.find((p) => p.value === pace)?.label ?? "";
  const fineTuneSummary = `${interestsPart} · ${paceLabel} pace`;

  return (
    <>
      {pending && <GeneratingOverlay />}

      <form action={action} className="space-y-5">
        {/* Conversational entry — the fast path */}
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Wand2 className="size-4 text-primary" />
            Describe your trip
          </p>
          <Textarea
            aria-label="Describe your trip"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setApplied(false);
            }}
            onBlur={() => {
              if (!applied && prompt.trim().length >= 4) applyPrompt(prompt);
            }}
            rows={2}
            placeholder="3 days in Kuching, RM1,500, couple, into food + nature"
            className="mt-2 bg-background"
            disabled={pending}
          />

          {!prompt && (
            <div
              className="mt-2 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
              aria-label="Example trip descriptions"
            >
              {PROMPT_STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applyStarter(s)}
                  disabled={pending}
                  className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyPrompt(prompt)}
              disabled={pending || prompt.trim().length < 4}
            >
              Use this
            </Button>
            {applied && (
              <span className="text-xs text-primary">
                ✓ Applied — check the trip essentials below.
              </span>
            )}
          </div>
        </div>

        {/* Trip essentials — compact, tap any row to change it */}
        <div>
          <p className="px-1 text-sm font-semibold">Trip essentials</p>
          <p className="px-1 text-xs text-muted-foreground">
            Sensible defaults are already set — tap a row to change it.
          </p>

          <div
            className={cn(
              "mt-2.5 space-y-2 rounded-2xl transition-shadow",
              justApplied && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
            )}
          >
            {/* destination — fixed, informational */}
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
              <RowIcon icon={MapPin} />
              <RowText label="Destination" value="Kuching & Sarawak" />
            </div>

            <EssentialRow
              icon={CalendarDays}
              label="Dates"
              value={datesSummary}
              id="dates"
              open={openSection === "dates"}
              onToggle={() => toggleSection("dates")}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">From</Label>
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
                  <Label htmlFor="endDate">To</Label>
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
            </EssentialRow>

            <EssentialRow
              icon={Users}
              label="Travellers"
              value={travellersSummary}
              id="travellers"
              open={openSection === "travellers"}
              onToggle={() => toggleSection("travellers")}
            >
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
              <div className="grid grid-cols-2 gap-3">
                <Stepper label="Adults" value={adults} min={1} onChange={setAdults} disabled={pending} />
                <Stepper label="Children" value={children} min={0} onChange={setChildren} disabled={pending} />
              </div>
            </EssentialRow>
            <input type="hidden" name="numAdults" value={adults} />
            <input type="hidden" name="numChildren" value={children} />

            <EssentialRow
              icon={Wallet}
              label="Budget"
              value={budgetSummary}
              id="budget"
              open={openSection === "budget"}
              onToggle={() => toggleSection("budget")}
            >
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
                        : "border-border bg-background hover:bg-accent",
                    )}
                  >
                    <span className="block text-xs font-medium">{b.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{b.sub}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">or MYR</span>
                <Input
                  aria-label="Budget per person in MYR"
                  name="budgetPerPerson"
                  type="number"
                  min={0}
                  step={100}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="h-8 max-w-32 bg-background"
                  disabled={pending}
                />
                <span className="text-xs text-muted-foreground">per person</span>
              </div>
            </EssentialRow>

            <EssentialRow
              icon={SlidersHorizontal}
              label="Fine-tune (optional)"
              value={fineTuneSummary}
              id="fine"
              open={openSection === "fine"}
              onToggle={() => toggleSection("fine")}
            >
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
                            : "border-border bg-background text-muted-foreground hover:bg-accent",
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
                          : "border-border bg-background text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="pace" value={pace} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Anything else?</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Travelling with grandparents, love photography, no seafood…"
                  disabled={pending}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">Trip name</Label>
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  disabled={pending}
                  className="bg-background"
                />
              </div>
            </EssentialRow>
          </div>
        </div>

        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}

        <Button
          type="submit"
          disabled={pending}
          variant="brand"
          className="w-full"
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

function RowIcon({ icon: Icon }: { icon: typeof MapPin }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-primary">
      <Icon className="size-4" />
    </span>
  );
}

function RowText({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-[10px] text-muted-foreground">{label}</span>
      <span className="block truncate text-xs font-semibold">{value}</span>
    </span>
  );
}

/**
 * One row of the "trip essentials" summary: a tap target showing the current value,
 * expanding in place to its real (always-mounted) form controls. The controls stay in
 * the DOM even when collapsed — only their visibility toggles — so their values keep
 * posting with the form regardless of which rows are open.
 */
function EssentialRow({
  icon,
  label,
  value,
  id,
  open,
  onToggle,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  id: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        open ? "border-primary/30 bg-primary/[0.03]" : "border-border bg-muted/40",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`essential-${id}`}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <RowIcon icon={icon} />
        <RowText label={label} value={value} />
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <div
        id={`essential-${id}`}
        className={open ? "space-y-3 border-t border-border/60 px-3 pb-3 pt-3" : "hidden"}
      >
        {children}
      </div>
    </div>
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
    <div className="space-y-1.5" role="group" aria-label={label}>
      <Label>{label}</Label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          className="grid size-8 place-items-center rounded-full border border-border bg-background disabled:opacity-40"
        >
          <Minus className="size-3.5" aria-hidden />
        </button>
        <span className="w-5 text-center text-sm font-medium tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          onClick={() => onChange(Math.min(20, value + 1))}
          disabled={disabled || value >= 20}
          className="grid size-8 place-items-center rounded-full border border-border bg-background disabled:opacity-40"
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
