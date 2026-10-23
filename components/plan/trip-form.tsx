"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Compass,
  Heart,
  MapPin,
  MessageSquareText,
  Minus,
  Plus,
  Sparkles,
  SlidersHorizontal,
  User,
  Users,
  UsersRound,
  Wallet,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { demoCategories } from "@/lib/demo/fixtures";
import { parseTripPrompt, type ParsedTrip } from "@/lib/plan/parse-prompt";
import { PROMPT_STARTERS } from "@/lib/plan/starters";
import { GeneratingOverlay } from "@/components/plan/generating-overlay";
import { CATEGORY_ICON } from "@/components/explore/category-icon";
import {
  generateTrip,
  interpretPrompt,
  type PlanState,
} from "@/app/(app)/plan/actions";
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

type Section = "dates" | "travellers" | "budget" | "fine" | null;

/**
 * The planner is guided first: four quick questions, a free-text box for anything extra, then a
 * summary to check before generating. "form" is the full planner form ("More options"), which
 * also holds every named input that posts — it stays mounted (CSS-hidden) whatever is showing.
 */
type Mode = "when" | "who" | "vibe" | "pace" | "extra" | "review" | "form";
const QUESTIONS: Mode[] = ["when", "who", "vibe", "pace"];

/** The guided "who" tiles, with the party each one starts from. */
const WHO: { value: GroupType; label: string; icon: LucideIcon; adults: number; children: number }[] = [
  { value: "solo", label: "Solo", icon: User, adults: 1, children: 0 },
  { value: "couple", label: "Couple", icon: Heart, adults: 2, children: 0 },
  { value: "family", label: "Family", icon: Users, adults: 2, children: 1 },
  { value: "friends", label: "Friends", icon: UsersRound, adults: 3, children: 0 },
];

const PACE_HINT: Record<TripPace, string> = {
  relaxed: "2–3 stops a day",
  moderate: "A full but easy day",
  packed: "See as much as possible",
};

const LENGTHS = [2, 3, 4, 5, 7];

/** One-tap additions for the "anything extra" box. */
const EXTRA_IDEAS = [
  "No seafood",
  "Vegetarian",
  "Travelling with grandparents",
  "Wheelchair friendly",
  "No hiking",
  "Love photography",
];

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

/** `initialPrompt`: a trip description from a link (Home quick starts, `/plan?q=`), applied on arrival. */
export function TripForm({
  defaultStart,
  defaultEnd,
  initialPrompt,
}: {
  defaultStart: string;
  defaultEnd: string;
  initialPrompt?: string;
}) {
  const [state, action, pending] = useActionState<PlanState, FormData>(
    generateTrip,
    {},
  );

  // A prompt from the link pre-fills the essentials exactly as typing it here would.
  const [seed] = useState(() =>
    initialPrompt ? parseTripPrompt(initialPrompt) : null,
  );
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [title, setTitle] = useState("My Sarawak trip");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(
    seed?.days ? addDays(defaultStart, seed.days - 1) : defaultEnd,
  );
  const [budget, setBudget] = useState(
    seed?.budgetPerPerson
      ? String(seed.budgetPerPerson)
      : seed?.budgetTotal
        ? String(Math.max(1, Math.round(seed.budgetTotal / ((seed.numAdults ?? 2) + (seed.numChildren ?? 0)))))
        : "1500",
  );
  const [groupType, setGroupType] = useState<GroupType>(
    seed?.groupType ?? "couple",
  );
  const [adults, setAdults] = useState(seed?.numAdults ?? 2);
  const [children, setChildren] = useState(seed?.numChildren ?? 0);
  const [interests, setInterests] = useState<Set<CategorySlug>>(
    new Set(
      seed?.interests?.length ? seed.interests : ["food", "nature", "culture"],
    ),
  );
  const [pace, setPace] = useState<TripPace>(seed?.pace ?? "moderate");
  const [notes, setNotes] = useState("");
  const [applied, setApplied] = useState(seed != null);
  const [justApplied, setJustApplied] = useState(seed != null);
  const [openSection, setOpenSection] = useState<Section>(null);
  // a trip sentence from a link (Home quick starts) already answers the questions: go to the summary
  const [mode, setMode] = useState<Mode>(seed ? "review" : "when");
  // editing one answer from the summary returns straight to it
  const [fromReview, setFromReview] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  // Only the latest server reading may fill the form: each request (and any edit) bumps this.
  const interpretSeq = useRef(0);
  const lastInterpreted = useRef("");
  // What the server (Claude / Jev) read the traveller ruling out, and in which sentence. Sent with the
  // form so generating the plan doesn't ask the AI to read the same sentence again.
  const [serverAvoid, setServerAvoid] = useState<{
    text: string;
    avoid: NonNullable<ParsedTrip["avoid"]>;
  } | null>(null);

  useEffect(() => {
    if (!justApplied) return;
    const id = setTimeout(() => setJustApplied(false), 1400);
    return () => clearTimeout(id);
  }, [justApplied]);

  function toggleSection(s: Exclude<Section, null>) {
    setOpenSection((cur) => (cur === s ? null : s));
  }

  function applyParsed(p: ParsedTrip) {
    if (p.startDate) {
      setStartDate(p.startDate);
      // a named start date keeps the trip's length unless the reading also gives one
      if (!p.days) setEndDate(addDays(p.startDate, nightsBetween(startDate, endDate)));
    }
    if (p.days) setEndDate(addDays(p.startDate ?? startDate, p.days - 1));
    if (p.groupType) setGroupType(p.groupType);
    // a couple or a solo traveller who mentions no children has none — even if an earlier sentence did
    const kids = p.numChildren ?? (p.groupType === "couple" || p.groupType === "solo" ? 0 : children);
    const grown = p.numAdults ?? adults;
    if (p.numAdults) setAdults(p.numAdults);
    setChildren(kids);
    if (p.budgetPerPerson) setBudget(String(p.budgetPerPerson));
    // a group total with no head-count in the sentence is split across the travellers on the form
    else if (p.budgetTotal) setBudget(String(Math.max(1, Math.round(p.budgetTotal / Math.max(1, grown + kids)))));
    if (p.interests?.length) setInterests(new Set(p.interests));
    if (p.pace) setPace(p.pace);
    setJustApplied(true);
  }

  /** Drop any reading still in flight (the traveller is editing by hand). */
  function cancelInterpret() {
    interpretSeq.current++;
    setInterpreting(false);
  }

  function applyPrompt(text: string) {
    // the rules' reading lands instantly; the server's (Claude / Jev, when on) refines it a moment later
    applyParsed(parseTripPrompt(text));
    setApplied(true);
    interpretOnServer(text);
  }

  function interpretOnServer(text: string) {
    const t = text.trim();
    // Chinese packs a trip into a few characters ("三天两夜情侣游"), so it needs fewer of them
    const minLength = /[㐀-鿿]/.test(t) ? 4 : 12;
    if (t.length < minLength || t === lastInterpreted.current) return;
    lastInterpreted.current = t;
    const id = ++interpretSeq.current;
    setInterpreting(true);
    interpretPrompt(t)
      .then((r) => {
        if (id !== interpretSeq.current || r.source === "rules") return;
        applyParsed(r.parsed);
        setServerAvoid({ text: t, avoid: r.parsed.avoid ?? { categories: [], slugs: [] } });
      })
      .catch(() => {}) // the rules' reading stands
      .finally(() => {
        if (id === interpretSeq.current) setInterpreting(false);
      });
  }

  // A prompt from a link was read by the rules on arrival (`seed`); let the server refine it too.
  const linkedPrompt = useRef(initialPrompt);
  useEffect(() => {
    const t = linkedPrompt.current;
    linkedPrompt.current = undefined; // once, even when an effect runs twice in dev
    if (t) interpretOnServer(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- arrival only
  }, []);

  function applyStarter(text: string) {
    setPrompt(text);
    setApplied(false);
    applyPrompt(text);
  }

  // each guided screen starts at the top
  function go(next: Mode) {
    setMode(next);
    window.scrollTo({ top: 0 });
  }

  /** Next on a question: the following one, or straight back to the summary when editing. */
  function advance(next: Mode) {
    if (fromReview) {
      setFromReview(false);
      go("review");
    } else {
      go(next);
    }
  }

  /** "Edit" on a summary line: open that question, and come back here after it. */
  function edit(step: Mode) {
    setFromReview(true);
    go(step);
  }

  function pickWho(w: (typeof WHO)[number]) {
    cancelInterpret();
    setGroupType(w.value);
    setAdults(w.adults);
    setChildren(w.children);
  }

  function addExtra(idea: string) {
    setPrompt((cur) => {
      const t = cur.trim();
      if (t.toLowerCase().includes(idea.toLowerCase())) return cur;
      return t ? `${t.replace(/[.,]$/, "")}, ${idea.toLowerCase()}` : idea;
    });
    setApplied(false);
  }

  /**
   * End of the guided path → the summary. The extra box is the traveller's own words (posted as
   * the trip `prompt`, which Claude / Jev read when the plan is generated). The tapped answers
   * stand as given; from the words we only take what they rule out ("no seafood", "no hiking"),
   * read on the server now so generating doesn't read the sentence again (`promptAvoid`).
   */
  function finishGuided() {
    setFromReview(false);
    readAvoidOnServer(prompt);
    go("review");
  }

  function readAvoidOnServer(text: string) {
    const t = text.trim();
    const minLength = /[㐀-鿿]/.test(t) ? 4 : 12;
    if (t.length < minLength || t === lastInterpreted.current) return;
    lastInterpreted.current = t;
    const id = ++interpretSeq.current;
    interpretPrompt(t)
      .then((r) => {
        if (id !== interpretSeq.current || r.source === "rules") return;
        setServerAvoid({ text: t, avoid: r.parsed.avoid ?? { categories: [], slugs: [] } });
      })
      .catch(() => {}); // the generate step reads it instead
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

      <form action={action}>
        {/* The planner form. Hidden (never unmounted) while the guided questions show, so every
            value still posts and the guided answers land straight in it. */}
        <div className={mode === "form" ? "space-y-5" : "hidden"}>
        <button
          type="button"
          onClick={() => go("review")}
          className="-ml-1 inline-flex items-center gap-1 rounded-full px-1 py-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to summary
        </button>
        {/* Conversational entry — the fast path */}
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Wand2 className="size-4 text-primary" />
            Describe your trip
          </p>
          <Textarea
            aria-label="Describe your trip"
            name="prompt"
            maxLength={300}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setApplied(false);
              cancelInterpret();
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
            <span aria-live="polite" className="text-xs">
              {interpreting ? (
                <span className="text-muted-foreground">Interpreting…</span>
              ) : applied ? (
                <span className="text-primary">
                  ✓ Applied — check the trip essentials below.
                </span>
              ) : null}
            </span>
          </div>
        </div>


        {/* Trip essentials — compact, tap any row to change it */}
        <div>
          <p className="px-1 text-sm font-semibold">Trip essentials</p>
          <p className="px-1 text-xs text-muted-foreground">
            Sensible defaults are already set — tap a row to change it.
          </p>

          <div
            onChangeCapture={cancelInterpret}
            onClickCapture={(e) => {
              // opening a row isn't an edit; pressing a chip, preset or stepper is
              if (!(e.target as HTMLElement).closest("[aria-expanded]")) cancelInterpret();
            }}
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
            <input
              type="hidden"
              name="promptAvoid"
              value={serverAvoid && serverAvoid.text === prompt.trim() ? JSON.stringify(serverAvoid.avoid) : ""}
            />
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
        </div>

        {/* ---------- guided path ---------- */}
        <GuidedStep
          active={mode === "when"}
          step={0}
          title="When are you going?"
          onBack={fromReview ? () => advance("review") : undefined}
          onNext={() => advance("who")}
          nextLabel={fromReview ? "Back to summary" : undefined}
        >
          <div className="space-y-1.5">
            <Label htmlFor="g-start">Arriving</Label>
            <Input
              id="g-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                const s = e.target.value;
                if (!s) return;
                cancelInterpret();
                setEndDate(addDays(s, nightsBetween(startDate, endDate)));
                setStartDate(s);
              }}
              className="h-11 rounded-xl px-3.5"
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">For how long?</p>
            <div className="flex flex-wrap gap-2">
              {LENGTHS.map((n) => (
                <ChoiceChip
                  key={n}
                  on={nights + 1 === n}
                  onClick={() => {
                    cancelInterpret();
                    setEndDate(addDays(startDate, n - 1));
                  }}
                >
                  {n} days
                </ChoiceChip>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{datesSummary}</p>
        </GuidedStep>

        <GuidedStep
          active={mode === "who"}
          step={1}
          title="Who's coming?"
          onBack={() => go("when")}
          onNext={() => advance("vibe")}
          nextLabel={fromReview ? "Back to summary" : undefined}
        >
          <div className="grid grid-cols-2 gap-2">
            {WHO.map((w) => (
              <ChoiceTile
                key={w.value}
                on={groupType === w.value}
                onClick={() => pickWho(w)}
                icon={w.icon}
                label={w.label}
              />
            ))}
          </div>
          {(groupType === "family" || groupType === "friends") && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border p-3">
              <Stepper label="Adults" value={adults} min={1} onChange={setAdults} disabled={pending} />
              <Stepper label="Children" value={children} min={0} onChange={setChildren} disabled={pending} />
            </div>
          )}
        </GuidedStep>

        <GuidedStep
          active={mode === "vibe"}
          step={2}
          title="What are you into?"
          hint="Pick as many as you like."
          onBack={() => go("who")}
          onNext={() => advance("pace")}
          nextLabel={fromReview ? "Back to summary" : undefined}
        >
          <div className="grid grid-cols-2 gap-2">
            {demoCategories.map((c) => (
              <ChoiceTile
                key={c.slug}
                on={interests.has(c.slug)}
                onClick={() => {
                  cancelInterpret();
                  toggleInterest(c.slug);
                }}
                icon={CATEGORY_ICON[c.slug]}
                label={c.name}
              />
            ))}
          </div>
        </GuidedStep>

        <GuidedStep
          active={mode === "pace"}
          step={3}
          title="How full should your days be?"
          onBack={() => go("vibe")}
          onNext={() => advance("extra")}
          nextLabel={fromReview ? "Back to summary" : undefined}
        >
          <div className="space-y-2">
            {PACES.map((p) => (
              <ChoiceTile
                key={p.value}
                on={pace === p.value}
                onClick={() => {
                  cancelInterpret();
                  setPace(p.value);
                }}
                label={p.label}
                sub={PACE_HINT[p.value]}
              />
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Budget per person</p>
            <div className="grid grid-cols-3 gap-2">
              {BUDGETS.map((b) => (
                <ChoiceTile
                  key={b.value}
                  on={budget === b.value}
                  onClick={() => {
                    cancelInterpret();
                    setBudget(b.value);
                  }}
                  label={b.label}
                  sub={b.sub}
                />
              ))}
            </div>
          </div>
        </GuidedStep>

        <GuidedStep
          active={mode === "extra"}
          step={4}
          title="Anything else we should know?"
          hint="Optional. Food, mobility, places to skip, things you love: write it your way."
          onBack={() => go("pace")}
          onNext={finishGuided}
          nextLabel={fromReview ? "Back to summary" : "Review my trip"}
        >
          <Textarea
            aria-label="Anything else for your trip"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setApplied(false);
              cancelInterpret();
            }}
            rows={4}
            maxLength={300}
            placeholder="No seafood, travelling with my mum who can't walk far, we'd love a sunset spot"
            className="bg-background text-base"
            disabled={pending}
          />
          <div className="flex flex-wrap gap-2" aria-label="Quick additions">
            {EXTRA_IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => addExtra(idea)}
                disabled={pending}
                className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Plus className="size-3" aria-hidden />
                {idea}
              </button>
            ))}
          </div>
        </GuidedStep>

        {/* ---------- summary: check the answers, then generate ---------- */}
        <section className={mode === "review" ? "space-y-5" : "hidden"} aria-labelledby="trip-summary">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">
              Your trip
            </p>
            <h2 id="trip-summary" className="mt-1 text-2xl font-bold tracking-tight">
              Ready to plan?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Check your answers. Our AI planner builds a day-by-day plan from real, verified
              Sarawak places.
            </p>
          </div>

          <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <SummaryRow icon={CalendarDays} label="When" value={datesSummary} onEdit={() => edit("when")} />
            <SummaryRow icon={Users} label="Who" value={travellersSummary} onEdit={() => edit("who")} />
            <SummaryRow
              icon={Compass}
              label="Into"
              value={interestNames.length ? interestNames.join(", ") : "A bit of everything"}
              onEdit={() => edit("vibe")}
            />
            <SummaryRow
              icon={Wallet}
              label="Pace and budget"
              value={`${paceLabel} pace · ${budgetSummary}`}
              onEdit={() => edit("pace")}
            />
            <SummaryRow
              icon={MessageSquareText}
              label="Anything else"
              value={prompt.trim() || "Nothing added"}
              muted={!prompt.trim()}
              onEdit={() => edit("extra")}
            />
          </dl>

          {state.error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <div className="space-y-2">
            <Button
              type="submit"
              disabled={pending}
              variant="brand"
              className="h-12 w-full rounded-full"
              size="lg"
            >
              <Sparkles className="size-4" />
              {pending ? "Building your itinerary…" : "Generate my trip"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Planned by AI from real, verified Sarawak places.
            </p>
          </div>

          <button
            type="button"
            onClick={() => go("form")}
            className="mx-auto flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            More options: trip name, exact dates, notes
          </button>
        </section>
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

/** One screen of the guided path: progress, the question, its choices, Back / Next. */
function GuidedStep({
  active,
  step,
  title,
  hint,
  onBack,
  onNext,
  nextLabel,
  children,
}: {
  active: boolean;
  /** 0–3 are the four questions; 4 is the optional "anything else" box */
  step: number;
  title: string;
  hint?: string;
  /** omitted on the first question */
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  children: ReactNode;
}) {
  const question = step < QUESTIONS.length;
  return (
    <section className={active ? "space-y-5" : "hidden"} aria-labelledby={`guided-${step}`}>
      <div className="flex gap-1.5" aria-hidden>
        {QUESTIONS.map((q, i) => (
          <span
            key={q}
            className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-border")}
          />
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          {question ? `Question ${step + 1} of ${QUESTIONS.length}` : "Last step · optional"}
        </p>
        <h2 id={`guided-${step}`} className="mt-1 text-2xl font-bold tracking-tight">
          {title}
        </h2>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
      <div className="flex gap-2 pt-2">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 flex-1 rounded-full"
            onClick={onBack}
          >
            Back
          </Button>
        )}
        <Button type="button" size="lg" className="h-12 flex-[2] rounded-full" onClick={onNext}>
          {nextLabel ?? "Next"}
        </Button>
      </div>
    </section>
  );
}

/** A big tappable choice for the guided path (single or multi select via `on`). */
function ChoiceTile({
  on,
  onClick,
  icon: Icon,
  label,
  sub,
}: {
  on: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent",
      )}
    >
      {Icon && (
        <span
          aria-hidden
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full",
            on ? "bg-primary text-primary-foreground" : "bg-accent text-primary",
          )}
        >
          <Icon className="size-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
      {on && !Icon && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
    </button>
  );
}

/** A pill toggle: unselected outline, selected solid violet with a check. */
function ChoiceChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent",
      )}
    >
      {on && <Check className="size-3" aria-hidden />}
      {children}
    </button>
  );
}

/** One answer on the summary, with an Edit that reopens its question. */
function SummaryRow({
  icon: Icon,
  label,
  value,
  muted,
  onEdit,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  muted?: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span
        aria-hidden
        className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-accent text-primary"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd
          className={cn(
            "text-sm break-words",
            muted ? "text-muted-foreground" : "font-semibold",
          )}
        >
          {value}
        </dd>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${label.toLowerCase()}`}
        className="-mr-2 inline-flex min-h-9 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Edit
      </button>
    </div>
  );
}
