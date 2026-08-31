import type {
  Attraction,
  CategorySlug,
  Experience,
} from "@/types/catalogue";
import type {
  Itinerary,
  ItineraryDay,
  ItineraryItem,
  ItineraryItemType,
  TripInput,
} from "@/types/trip";
import { tripNights } from "@/types/trip";
import { weekdayKey } from "@/lib/format";

export interface Candidates {
  experiences: Experience[];
  attractions: Attraction[];
}

const CAT_LABEL: Record<CategorySlug, string> = {
  nature: "nature",
  wildlife: "wildlife",
  culture: "culture",
  heritage: "heritage",
  food: "food",
  adventure: "adventure",
  shopping: "shopping",
};

const OUTDOOR: CategorySlug[] = ["nature", "adventure", "wildlife"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function pax(trip: TripInput) {
  return Math.max(1, trip.numAdults + trip.numChildren);
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Two "HH:MM" ranges share any time (zero-padded strings compare correctly). */
function overlaps(aS: string, aE: string, bS: string, bE: string): boolean {
  return aS < bE && bS < aE;
}

/** The real start time the vendor runs this experience at. */
function expStartTime(e: Experience, fallback: string): string {
  return e.availability.times[0] ?? fallback;
}

/** Does the experience operate on this weekday? (no days listed = any day) */
function expRunsOn(e: Experience, weekday: string): boolean {
  return e.availability.days.length === 0 || e.availability.days.includes(weekday);
}

/**
 * Best-effort "closed today" check against the free-form `openingHours` map
 * (e.g. `{ mon: "Closed" }` on the museum / fort).
 */
function attClosedOn(a: Attraction, weekday: string): boolean {
  return Object.entries(a.openingHours).some(
    ([k, v]) => k.toLowerCase() === weekday && /clos/i.test(v),
  );
}

function sortByTime(items: ItineraryItem[]): ItineraryItem[] {
  return [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** First candidate start whose `mins`-long slot doesn't collide with `occupied`. */
function firstFreeSlot(
  occupied: Array<[string, string]>,
  starts: string[],
  mins: number,
): string | null {
  for (const s of starts) {
    const e = addMinutes(s, mins);
    if (occupied.every(([os, oe]) => !overlaps(s, e, os, oe))) return s;
  }
  return null;
}

function isoDate(start: string, offsetDays: number): string {
  const d = new Date(start);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function matched(cats: CategorySlug[], interests: CategorySlug[]): CategorySlug[] {
  return cats.filter((c) => interests.includes(c));
}

function scoreExp(e: Experience, interests: CategorySlug[]): number {
  const m = matched(e.categories, interests).length;
  return (interests.length ? m * 10 : 5) + (e.rating ?? 4);
}
function scoreAtt(a: Attraction, interests: CategorySlug[]): number {
  const m = matched(a.categories, interests).length;
  return (interests.length ? m * 10 : 5) + (a.isFree ? 1 : 0);
}

function why(cats: CategorySlug[], interests: CategorySlug[]): string {
  const m = matched(cats, interests).map((c) => CAT_LABEL[c]);
  if (m.length) return `Matches your interest in ${m.join(" & ")}.`;
  return "A Kuching highlight worth making time for.";
}

// ---- item builders ----

function expItem(
  e: Experience,
  fallbackStart: string,
  trip: TripInput,
): ItineraryItem {
  const start = expStartTime(e, fallbackStart);
  return {
    id: uid(),
    type: "experience",
    startTime: start,
    endTime: addMinutes(start, e.durationMinutes),
    durationMinutes: e.durationMinutes,
    title: e.title,
    description: e.summary ?? e.description ?? "",
    whyRecommended: why(e.categories, trip.interests),
    estimatedCost: e.pricePerPerson * pax(trip),
    locationLabel: e.location?.name ?? "Sarawak",
    attractionSlug: null,
    experienceId: e.id,
    bookable: true,
  };
}

function attItem(
  a: Attraction,
  start: string,
  trip: TripInput,
): ItineraryItem {
  const unit = a.isFree ? 0 : a.priceMin;
  return {
    id: uid(),
    type: "attraction",
    startTime: start,
    endTime: addMinutes(start, a.avgVisitMinutes),
    durationMinutes: a.avgVisitMinutes,
    title: a.name,
    description: a.summary ?? a.description ?? "",
    whyRecommended: why(a.categories, trip.interests),
    estimatedCost: unit * pax(trip),
    locationLabel: a.location?.name ?? "Sarawak",
    attractionSlug: a.slug,
    experienceId: null,
    bookable: false,
  };
}

function mealItem(
  start: string,
  kind: "lunch" | "dinner",
  trip: TripInput,
): ItineraryItem {
  const unit = kind === "lunch" ? 35 : 55;
  const foodie = trip.interests.includes("food");
  return {
    id: uid(),
    type: "meal",
    startTime: start,
    endTime: addMinutes(start, kind === "lunch" ? 60 : 90),
    durationMinutes: kind === "lunch" ? 60 : 90,
    title:
      kind === "lunch" ? "Lunch — local Sarawak food" : "Dinner in town",
    description:
      kind === "lunch"
        ? foodie
          ? "Kolo mee, laksa or a quick Sarawak-style rice plate near your morning stop."
          : "A relaxed local lunch near your morning stop."
        : foodie
          ? "Seafood, midin and a night-market wander — ask your host for the day's pick."
          : "An easy local dinner to end the day.",
    whyRecommended: null,
    estimatedCost: unit * pax(trip),
    locationLabel: "Kuching",
    attractionSlug: null,
    experienceId: null,
    bookable: false,
  };
}

function freeTime(start: string, label: string): ItineraryItem {
  return {
    id: uid(),
    type: "free_time",
    startTime: start,
    endTime: addMinutes(start, 120),
    durationMinutes: 120,
    title: label,
    description: "Time to wander, rest, or revisit a favourite spot.",
    whyRecommended: null,
    estimatedCost: 0,
    locationLabel: null,
    attractionSlug: null,
    experienceId: null,
    bookable: false,
  };
}

// ---- generator ----

export function buildItinerary(
  trip: TripInput,
  candidates: Candidates,
): Itinerary {
  const nights = tripNights(trip);
  const budgetTight =
    trip.budgetPerPerson != null && trip.budgetPerPerson < 900;

  const exps = [...candidates.experiences]
    .filter((e) =>
      trip.interests.length
        ? matched(e.categories, trip.interests).length > 0
        : true,
    )
    .sort((a, b) => scoreExp(b, trip.interests) - scoreExp(a, trip.interests));

  const atts = [...candidates.attractions]
    .filter((a) =>
      trip.interests.length
        ? matched(a.categories, trip.interests).length > 0
        : true,
    )
    .sort((a, b) => scoreAtt(b, trip.interests) - scoreAtt(a, trip.interests));

  // fall back to everything if interest filter emptied a pool
  const expPool = exps.length ? exps : [...candidates.experiences];
  const attPool = atts.length ? atts : [...candidates.attractions];

  const usedExp = new Set<string>();
  const usedAtt = new Set<string>();
  const peekExp = (pred?: (e: Experience) => boolean) =>
    expPool.find((e) => !usedExp.has(e.id) && (!pred || pred(e))) ?? null;
  const peekAtt = (pred?: (a: Attraction) => boolean) =>
    attPool.find((a) => !usedAtt.has(a.slug) && (!pred || pred(a))) ?? null;

  const maxExps = budgetTight ? 1 : trip.pace === "packed" ? nights + 1 : nights;
  let usedExps = 0;

  const days: ItineraryDay[] = [];

  for (let d = 1; d <= nights; d++) {
    const date = isoDate(trip.startDate, d - 1);
    const weekday = weekdayKey(date);
    const items: ItineraryItem[] = [];
    const occupied: Array<[string, string]> = [];
    const isFree = (s: string, e: string) =>
      occupied.every(([os, oe]) => !overlaps(s, e, os, oe));

    const addAtt = (a: Attraction, start: string) => {
      usedAtt.add(a.slug);
      const it = attItem(a, start, trip);
      items.push(it);
      occupied.push([it.startTime, it.endTime]);
    };
    const addExp = (e: Experience, fallbackStart: string) => {
      usedExp.add(e.id);
      const it = expItem(e, fallbackStart, trip);
      items.push(it);
      occupied.push([it.startTime, it.endTime]);
      usedExps++;
    };
    const addFixed = (it: ItineraryItem) => {
      items.push(it);
      occupied.push([it.startTime, it.endTime]);
    };

    const first = d === 1;
    const last = d === nights && nights > 1;

    if (first) {
      const a = peekAtt((x) => !attClosedOn(x, weekday));
      if (a) addAtt(a, "15:00");
      addFixed(mealItem("19:00", "dinner", trip));
      days.push({
        dayNumber: d,
        date,
        summary: "Arrival and a gentle first look at Kuching.",
        items: sortByTime(items),
      });
      continue;
    }

    if (last) {
      const a = peekAtt((x) => !attClosedOn(x, weekday));
      if (a) addAtt(a, "09:30");
      addFixed(mealItem("12:30", "lunch", trip));
      days.push({
        dayNumber: d,
        date,
        summary: "A last morning, then onward travel.",
        items: sortByTime(items),
      });
      continue;
    }

    // ---- full day ----
    // 1) the day's headline experience, at its real start time, on a day it runs
    let placedExp = false;
    if (usedExps < maxExps) {
      const e = peekExp((x) => expRunsOn(x, weekday));
      if (e) {
        addExp(e, "09:00");
        placedExp = true;
      }
    }

    // 2) a second experience on packed / alternating days — only if it fits
    if (usedExps < maxExps && (trip.pace === "packed" || d % 2 === 0)) {
      const e = peekExp((x) => {
        if (!expRunsOn(x, weekday)) return false;
        const s = expStartTime(x, "14:30");
        return isFree(s, addMinutes(s, x.durationMinutes));
      });
      if (e) addExp(e, "14:30");
    }

    // 3) lunch, if the midday window is open
    if (isFree("12:30", "13:30")) addFixed(mealItem("12:30", "lunch", trip));

    // 4) a morning stop, if there's room before noon
    if (isFree("09:30", "12:00")) {
      const a = peekAtt(
        (x) =>
          !attClosedOn(x, weekday) &&
          isFree("09:30", addMinutes("09:30", x.avgVisitMinutes)),
      );
      if (a) addAtt(a, "09:30");
    }

    // 5) the afternoon — another stop, or open time on a relaxed day
    if (isFree("14:30", "17:00")) {
      const a = peekAtt(
        (x) =>
          !attClosedOn(x, weekday) &&
          isFree("14:30", addMinutes("14:30", x.avgVisitMinutes)),
      );
      if (a) addAtt(a, "14:30");
      else if (trip.pace === "relaxed" || !placedExp)
        addFixed(freeTime("14:30", "Free afternoon"));
    }

    // 6) make sure the traveller eats — unless a food experience covers dinner
    const dinnerCovered = items.some((i) => {
      if (i.type !== "experience") return false;
      const e = expPool.find((x) => x.id === i.experienceId);
      return (
        !!e &&
        e.categories.includes("food") &&
        overlaps(i.startTime, i.endTime, "18:00", "21:00")
      );
    });
    if (!items.some((i) => i.type === "meal") && !dinnerCovered) {
      const slot = firstFreeSlot(
        occupied,
        ["19:00", "19:30", "18:30", "20:00", "13:00", "12:00", "20:30"],
        75,
      );
      if (slot) {
        addFixed(mealItem(slot, slot >= "15:00" ? "dinner" : "lunch", trip));
      }
    }

    // 7) a packed day earns an evening stop, if there's still room
    if (trip.pace === "packed" && isFree("18:30", "20:30")) {
      const a = peekAtt(
        (x) =>
          !attClosedOn(x, weekday) &&
          isFree("18:30", addMinutes("18:30", x.avgVisitMinutes)),
      );
      if (a) addAtt(a, "18:30");
    }

    const themeCats = items
      .flatMap((i) =>
        i.experienceId
          ? (expPool.find((e) => e.id === i.experienceId)?.categories ?? [])
          : i.attractionSlug
            ? (attPool.find((a) => a.slug === i.attractionSlug)?.categories ??
              [])
            : [],
      )
      .map((c) => CAT_LABEL[c]);
    const uniqueTheme = [...new Set(themeCats)].slice(0, 2);

    days.push({
      dayNumber: d,
      date,
      summary: uniqueTheme.length
        ? `A day around ${uniqueTheme.join(" and ")}.`
        : "Exploring more of Kuching and around.",
      items: sortByTime(items),
    });
  }

  const interestStr = trip.interests.length
    ? trip.interests.join(", ")
    : "a bit of everything";

  return {
    id: uid(),
    version: 1,
    generatedBy: "ai",
    model: null,
    requestSummary: `${nights} day${nights === 1 ? "" : "s"} in Kuching · ${trip.groupType} · ${interestStr}`,
    days,
    createdAt: new Date().toISOString(),
  };
}

// ---- rule-based refinement (stands in for the LLM edit call in demo) ----

export interface RefineResult {
  itinerary: Itinerary;
  note: string;
}

function targetDays(instruction: string, total: number): number[] {
  const m = instruction.match(/day\s*(\d+)/i);
  if (m) {
    const n = Number(m[1]);
    return n >= 1 && n <= total ? [n] : [];
  }
  if (/tomorrow/i.test(instruction) && total >= 2) return [2];
  if (/today|first day/i.test(instruction)) return [1];
  return Array.from({ length: total }, (_, i) => i + 1);
}

function catsOf(item: ItineraryItem, c: Candidates): CategorySlug[] {
  if (item.experienceId)
    return c.experiences.find((e) => e.id === item.experienceId)?.categories ?? [];
  if (item.attractionSlug)
    return (
      c.attractions.find((a) => a.slug === item.attractionSlug)?.categories ?? []
    );
  return [];
}

function usedIds(it: Itinerary) {
  const exp = new Set<string>();
  const att = new Set<string>();
  for (const d of it.days)
    for (const i of d.items) {
      if (i.experienceId) exp.add(i.experienceId);
      if (i.attractionSlug) att.add(i.attractionSlug);
    }
  return { exp, att };
}

export function applyRefinement(
  itinerary: Itinerary,
  instruction: string,
  trip: TripInput,
  candidates: Candidates,
): RefineResult {
  const text = instruction.toLowerCase();
  const total = itinerary.days.length;
  const targets = new Set(targetDays(text, total));
  const notes: string[] = [];
  const px = pax(trip);

  const wantsCheaper = /cheap|budget|less expensive|save|afford/.test(text);
  const wantsFood = /food|eat|culinar|hawker|restaurant|cuisine|laksa/.test(text);
  const noOutdoor =
    /no outdoor|indoor|not outdoor|avoid outdoor|less outdoor|rain|too hot/.test(
      text,
    );
  const wantsRelax = /relax|less packed|slow|too much|fewer|lighter|tiring/.test(
    text,
  );
  const wantsCulture = /culture|heritage|histor|museum|temple|longhouse/.test(
    text,
  );

  const days = itinerary.days.map((day) => {
    if (!targets.has(day.dayNumber)) return { ...day, items: [...day.items] };
    let items = [...day.items];
    const { exp: usedExp, att: usedAtt } = usedIds(itinerary);

    if (wantsCheaper) {
      const idx = items
        .map((i, k) => ({ i, k }))
        .filter((x) => x.i.type === "experience")
        .sort((a, b) => b.i.estimatedCost - a.i.estimatedCost)[0]?.k;
      if (idx != null) {
        const replacement = candidates.attractions
          .filter(
            (a) =>
              !usedAtt.has(a.slug) &&
              (a.isFree || a.priceMin <= 20) &&
              (!trip.interests.length ||
                matched(a.categories, trip.interests).length > 0),
          )
          .sort((a, b) => scoreAtt(b, trip.interests) - scoreAtt(a, trip.interests))[0];
        items[idx] = replacement
          ? attItem(replacement, items[idx].startTime, trip)
          : freeTime(items[idx].startTime, "Free time (swapped to save cost)");
        notes.push(`Day ${day.dayNumber}: swapped a paid tour for a low-cost stop.`);
      }
    }

    if (noOutdoor) {
      items = items.map((it) => {
        const cats = catsOf(it, candidates);
        if (cats.some((c) => OUTDOOR.includes(c))) {
          const alt = candidates.attractions
            .filter(
              (a) =>
                !usedAtt.has(a.slug) &&
                !a.categories.some((c) => OUTDOOR.includes(c)),
            )
            .sort((a, b) => scoreAtt(b, ["culture", "heritage"]) - scoreAtt(a, ["culture", "heritage"]))[0];
          if (alt) {
            usedAtt.add(alt.slug);
            return attItem(alt, it.startTime, trip);
          }
          return freeTime(it.startTime, "Indoor free time");
        }
        return it;
      });
      notes.push(`Day ${day.dayNumber}: removed outdoor activities.`);
    }

    if (wantsFood) {
      const hasFood = items.some((it) =>
        catsOf(it, candidates).includes("food"),
      );
      if (!hasFood) {
        const foodExp = candidates.experiences
          .filter(
            (e) => !usedExp.has(e.id) && e.categories.includes("food"),
          )
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
        const swapIdx = items.findIndex(
          (it) => it.type === "attraction" || it.type === "free_time",
        );
        if (foodExp && swapIdx !== -1) {
          items[swapIdx] = expItem(foodExp, items[swapIdx].startTime, trip);
          notes.push(`Day ${day.dayNumber}: added a food experience.`);
        }
      }
    }

    if (wantsCulture) {
      const hasCulture = items.some((it) =>
        catsOf(it, candidates).some((c) => c === "culture" || c === "heritage"),
      );
      if (!hasCulture) {
        const alt = candidates.attractions
          .filter(
            (a) =>
              !usedAtt.has(a.slug) &&
              a.categories.some((c) => c === "culture" || c === "heritage"),
          )
          .sort((a, b) => scoreAtt(b, ["culture", "heritage"]) - scoreAtt(a, ["culture", "heritage"]))[0];
        const swapIdx = items.findIndex((it) => it.type === "free_time");
        if (alt && swapIdx !== -1) {
          items[swapIdx] = attItem(alt, items[swapIdx].startTime, trip);
          notes.push(`Day ${day.dayNumber}: added a heritage stop.`);
        }
      }
    }

    if (wantsRelax) {
      const lastNonMeal = [...items]
        .reverse()
        .find((it) => it.type !== "meal");
      if (lastNonMeal && items.length > 2) {
        items = items.filter((it) => it.id !== lastNonMeal.id);
        notes.push(`Day ${day.dayNumber}: eased the pace — dropped one stop.`);
      }
    }

    void px;
    return {
      ...day,
      items: items.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    };
  });

  if (!notes.length) {
    notes.push(
      "I couldn't map that to a change — try “make day 2 cheaper”, “more food”, or “no outdoor activities tomorrow”.",
    );
  }

  return {
    itinerary: {
      ...itinerary,
      version: itinerary.version + 1,
      generatedBy: "user",
      days,
      createdAt: new Date().toISOString(),
    },
    note: notes.join(" "),
  };
}

// ---- manual edits ----

export function removeItem(itinerary: Itinerary, itemId: string): Itinerary {
  return {
    ...itinerary,
    version: itinerary.version + 1,
    generatedBy: "user",
    days: itinerary.days.map((d) => ({
      ...d,
      items: d.items.filter((i) => i.id !== itemId),
    })),
  };
}

export function addExperienceToDay(
  itinerary: Itinerary,
  dayNumber: number,
  exp: Experience,
  trip: TripInput,
): Itinerary {
  return {
    ...itinerary,
    version: itinerary.version + 1,
    generatedBy: "user",
    days: itinerary.days.map((d) => {
      if (d.dayNumber !== dayNumber) return d;
      const last = d.items[d.items.length - 1];
      const start = last ? addMinutes(last.endTime, 30) : "09:00";
      return {
        ...d,
        items: [...d.items, expItem(exp, start, trip)].sort((a, b) =>
          a.startTime.localeCompare(b.startTime),
        ),
      };
    }),
  };
}

export const ITEM_TYPE_LABEL: Record<ItineraryItemType, string> = {
  experience: "Experience",
  attraction: "Attraction",
  meal: "Meal",
  transport: "Transport",
  free_time: "Free time",
};
