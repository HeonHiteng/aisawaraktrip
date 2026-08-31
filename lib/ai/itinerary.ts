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
  start: string,
  trip: TripInput,
): ItineraryItem {
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
      kind === "lunch"
        ? "Lunch — local Sarawak food"
        : "Dinner by the Waterfront",
    description: foodie
      ? "Try Sarawak laksa, kolo mee or midin — ask your guide for the day's pick."
      : "A relaxed local meal near your afternoon stop.",
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

  let ei = 0;
  let ai = 0;
  const nextExp = () => (ei < expPool.length ? expPool[ei++] : null);
  const nextAtt = () => (ai < attPool.length ? attPool[ai++] : null);

  const maxExps = budgetTight ? 1 : trip.pace === "packed" ? nights + 1 : nights;
  let usedExps = 0;

  const days: ItineraryDay[] = [];

  for (let d = 1; d <= nights; d++) {
    const date = isoDate(trip.startDate, d - 1);
    const items: ItineraryItem[] = [];
    const first = d === 1;
    const last = d === nights && nights > 1;

    if (first) {
      const a = nextAtt();
      if (a) items.push(attItem(a, "15:00", trip));
      items.push(mealItem("19:00", "dinner", trip));
      days.push({
        dayNumber: d,
        date,
        summary: "Arrival and a gentle first look at Kuching.",
        items,
      });
      continue;
    }

    if (last) {
      const a = nextAtt();
      if (a) items.push(attItem(a, "09:30", trip));
      items.push(mealItem("12:30", "lunch", trip));
      days.push({
        dayNumber: d,
        date,
        summary: "A last morning, then onward travel.",
        items,
      });
      continue;
    }

    // full day
    const morningExp =
      usedExps < maxExps ? nextExp() : null;
    if (morningExp) {
      items.push(expItem(morningExp, "09:00", trip));
      usedExps++;
    } else {
      const a = nextAtt();
      if (a) items.push(attItem(a, "09:00", trip));
    }

    items.push(mealItem("12:30", "lunch", trip));

    if (trip.pace === "relaxed") {
      const a = nextAtt();
      if (a) items.push(attItem(a, "15:00", trip));
      else items.push(freeTime("15:00", "Free afternoon"));
    } else {
      const afternoonExp =
        usedExps < maxExps && d % 2 === 0 ? nextExp() : null;
      if (afternoonExp) {
        items.push(expItem(afternoonExp, "14:30", trip));
        usedExps++;
      } else {
        const a = nextAtt();
        if (a) items.push(attItem(a, "14:30", trip));
        else items.push(freeTime("14:30", "Free afternoon"));
      }
      if (trip.pace === "packed") {
        const a = nextAtt();
        if (a) items.push(attItem(a, "18:00", trip));
        else items.push(mealItem("19:00", "dinner", trip));
      }
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
      items: items.sort((x, y) => x.startTime.localeCompare(y.startTime)),
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
