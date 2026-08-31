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
import { parseTripPrompt } from "@/lib/plan/parse-prompt";

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

/** The old town / base. Everything else is a drive out. */
const CITY = "Kuching City Centre";

/** Rough transfer from the city to each outlying area (private car / Grab). */
const TRAVEL: Record<string, { minutes: number; groupCost: number }> = {
  "Santubong & Damai": { minutes: 45, groupCost: 90 },
  Bako: { minutes: 55, groupCost: 100 },
  Semenggoh: { minutes: 40, groupCost: 70 },
  "Padawan & Annah Rais": { minutes: 60, groupCost: 110 },
};

function areaName(loc: { name: string } | null | undefined): string {
  return loc?.name ?? CITY;
}

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

const WHY_BY_SLUG: Record<string, string> = {
  "kuching-waterfront":
    "An easy first walk to get your bearings — riverfront, food stalls and sunset over the fort.",
  "borneo-cultures-museum":
    "The best single primer on Sarawak's peoples and rainforest before you head out of town.",
  "fort-margherita":
    "A short sampan crossing to the Brooke-era fort — history plus rooftop views of the old town.",
  "tua-pek-kong-temple":
    "Kuching's oldest Chinese temple — a five-minute stop that anchors the old town.",
  "semenggoh-nature-reserve":
    "Timed for a feeding session, for the best odds of seeing the semi-wild orang-utans.",
  "bako-national-park":
    "Coastal rainforest and near-guaranteed proboscis monkeys, a short boat ride from the jetty.",
  "sarawak-cultural-village":
    "Seven traditional dwellings in one place, with a cultural show — a solid half-day near Santubong.",
  "main-bazaar-carpenter-street":
    "Heritage shophouses for pua kumbu, pepper and beadwork, plus Carpenter Street's coffee shops.",
  "kuching-heritage-street-food-walk":
    "A guided tasting crawl of the old town — the fastest way into Sarawak's food.",
  "sarawak-laksa-kolo-mee-cooking-class":
    "Hands-on with the two dishes you'll want to recreate at home.",
  "santubong-sunset-wildlife-river-cruise":
    "Dolphins, proboscis monkeys and fireflies as the light goes — an easy afternoon out.",
  "bako-national-park-full-day-trek":
    "A naturalist-guided day in Bako, with trails matched to your fitness.",
  "sarawak-kiri-river-kayaking-semadang":
    "Beginner-friendly paddling through Padawan rainforest, with a village lunch.",
  "annah-rais-longhouse-bidayuh-culture-day":
    "A full day hosted by a Bidayuh family at a living longhouse — respectful and community-run.",
};

function why(
  slug: string | null,
  cats: CategorySlug[],
  interests: CategorySlug[],
): string {
  if (slug && WHY_BY_SLUG[slug]) return WHY_BY_SLUG[slug];
  const m = matched(cats, interests).map((c) => CAT_LABEL[c]);
  if (m.length) return `Picked for your interest in ${m.join(" and ")}.`;
  return "A well-rated Kuching stop that rounds out the day.";
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
    whyRecommended: why(e.slug, e.categories, trip.interests),
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
    whyRecommended: why(a.slug, a.categories, trip.interests),
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

function transportItem(
  start: string,
  area: string,
  minutes: number,
  groupCost: number,
  direction: "out" | "back",
): ItineraryItem {
  return {
    id: uid(),
    type: "transport",
    startTime: start,
    endTime: addMinutes(start, minutes),
    durationMinutes: minutes,
    title: direction === "out" ? `Transfer to ${area}` : "Drive back to Kuching",
    description: `About ${minutes} minutes by private car or Grab.`,
    whyRecommended: null,
    estimatedCost: groupCost, // per vehicle, not per person
    locationLabel: direction === "out" ? area : CITY,
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

  // Things the traveller asked to leave out, parsed from the free-text notes.
  const avoid = parseTripPrompt(trip.notes ?? "").avoid ?? {
    categories: [],
    slugs: [],
  };
  const avoidCat = new Set(avoid.categories);
  const avoidSlug = new Set(avoid.slugs);
  const wanted = (slug: string, cats: CategorySlug[]) =>
    !avoidSlug.has(slug) && !cats.some((c) => avoidCat.has(c));

  const byInterest = <T extends { categories: CategorySlug[] }>(pool: T[]) =>
    trip.interests.length
      ? pool.filter((x) => matched(x.categories, trip.interests).length > 0)
      : pool;

  const expScoped = byInterest([...candidates.experiences]);
  const attScoped = byInterest([...candidates.attractions]);

  // fall back to the full set if the interest filter emptied a pool, THEN drop
  // anything the traveller vetoed (no fallback past a veto).
  const expPool = (expScoped.length ? expScoped : [...candidates.experiences])
    .filter((e) => wanted(e.slug, e.categories))
    .sort((a, b) => scoreExp(b, trip.interests) - scoreExp(a, trip.interests));
  const attPool = (attScoped.length ? attScoped : [...candidates.attractions])
    .filter((a) => wanted(a.slug, a.categories))
    .sort((a, b) => scoreAtt(b, trip.interests) - scoreAtt(a, trip.interests));

  // The full set minus vetoes — used for arrival/departure filler where any
  // sensible stop will do, even if it doesn't match a stated interest.
  const attAll = [
    ...attPool,
    ...candidates.attractions.filter(
      (a) =>
        wanted(a.slug, a.categories) &&
        !attPool.some((p) => p.slug === a.slug),
    ),
  ];

  const usedExp = new Set<string>();
  const usedAtt = new Set<string>();
  const peekExp = (pred?: (e: Experience) => boolean) =>
    expPool.find((e) => !usedExp.has(e.id) && (!pred || pred(e))) ?? null;
  const peekAtt = (pred?: (a: Attraction) => boolean) =>
    attPool.find((a) => !usedAtt.has(a.slug) && (!pred || pred(a))) ?? null;
  const peekAny = (pred: (a: Attraction) => boolean) =>
    attAll.find((a) => !usedAtt.has(a.slug) && pred(a)) ?? null;

  const catsFor = (item: ItineraryItem): CategorySlug[] =>
    item.experienceId
      ? (expPool.find((e) => e.id === item.experienceId)?.categories ?? [])
      : item.attractionSlug
        ? (attPool.find((a) => a.slug === item.attractionSlug)?.categories ?? [])
        : [];

  const maxExps = budgetTight ? 1 : trip.pace === "packed" ? nights + 1 : nights;
  let usedExps = 0;
  let prevExcursion = false;

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
    const semenggohStart = (slot: "am" | "pm") =>
      slot === "am" ? "08:45" : "15:00";

    const first = d === 1;
    const last = d === nights && nights > 1;

    // ---------- arrival day ----------
    if (first) {
      const a = peekAny(
        (x) => !attClosedOn(x, weekday) && areaName(x.location) === CITY,
      );
      if (a) addAtt(a, "15:00");
      // an evening city experience (e.g. the food walk) beats just a dinner
      const eve =
        usedExps < maxExps
          ? peekExp(
              (e) =>
                areaName(e.location) === CITY &&
                expRunsOn(e, weekday) &&
                expStartTime(e, "18:00") >= "16:30",
            )
          : null;
      if (eve) addExp(eve, "18:00");
      // a second short old-town stop if there's a gap before dinner
      if (isFree("16:15", "17:15")) {
        const b = peekAny(
          (x) =>
            !attClosedOn(x, weekday) &&
            areaName(x.location) === CITY &&
            x.avgVisitMinutes <= 60,
        );
        if (b) addAtt(b, "16:15");
      }
      const hasFoodExp = items.some(
        (i) => i.type === "experience" && catsFor(i).includes("food"),
      );
      if (!hasFoodExp) addFixed(mealItem("19:00", "dinner", trip));
      prevExcursion = false;
      days.push({
        dayNumber: d,
        date,
        summary: eve
          ? "Arrive, drop your bags, and head straight into the old town."
          : "Arrival and a gentle first look at Kuching.",
        items: sortByTime(items),
      });
      continue;
    }

    // ---------- departure day ----------
    if (last) {
      const a = peekAny(
        (x) => !attClosedOn(x, weekday) && areaName(x.location) === CITY,
      );
      if (a) addAtt(a, "09:30");
      addFixed(mealItem("12:30", "lunch", trip));
      days.push({
        dayNumber: d,
        date,
        summary: "A last morning in the old town, then onward travel.",
        items: sortByTime(items),
      });
      continue;
    }

    // ---------- a full day ----------
    // Anchor selection:
    //  - excursions (an outlying experience, or a lighter outlying attraction)
    //    make the strongest days, but back-to-back day trips are tiring, so
    //    after an excursion we try a city day first.
    //  - a tight budget skips excursions entirely — the private transfers and
    //    pricier day tours are where the money goes.
    let dayArea = CITY;
    let placedExp = false;
    const preferCity =
      prevExcursion && trip.pace !== "packed" && !budgetTight;

    const pickOutExp = () =>
      usedExps < maxExps && !budgetTight
        ? peekExp((e) => expRunsOn(e, weekday) && areaName(e.location) !== CITY)
        : null;
    const pickCityExp = () =>
      usedExps < maxExps
        ? peekExp((e) => expRunsOn(e, weekday) && areaName(e.location) === CITY)
        : null;

    let anchorExp: Experience | null = null;
    let anchorIsExcursion = false;
    if (preferCity) {
      anchorExp = pickCityExp();
      if (!anchorExp) {
        anchorExp = pickOutExp();
        anchorIsExcursion = !!anchorExp;
      }
    } else {
      anchorExp = pickOutExp();
      anchorIsExcursion = !!anchorExp;
      if (!anchorExp) anchorExp = pickCityExp();
    }

    if (anchorExp) {
      if (anchorIsExcursion) dayArea = areaName(anchorExp.location);
      addExp(anchorExp, "09:00");
      placedExp = true;
    } else if (!budgetTight && !preferCity) {
      const outAtt = peekAtt(
        (a) => !attClosedOn(a, weekday) && areaName(a.location) !== CITY,
      );
      if (outAtt) {
        dayArea = areaName(outAtt.location);
        addAtt(
          outAtt,
          outAtt.slug === "semenggoh-nature-reserve"
            ? semenggohStart("am")
            : "09:30",
        );
      }
    }

    const anchor = items[0];
    const excursion = dayArea !== CITY;
    const morningExcursion =
      excursion && (anchor?.endTime ?? "23:59") <= "13:00";
    const eveningExcursion =
      excursion && (anchor?.startTime ?? "00:00") >= "14:00";
    // which area the free morning / afternoon windows draw from
    const morningArea = eveningExcursion ? CITY : dayArea;
    const afternoonArea = morningExcursion ? CITY : dayArea;

    // a second same-area experience on packed / longer city days
    if (
      usedExps < maxExps &&
      !morningExcursion &&
      (trip.pace === "packed" || (!excursion && d % 2 === 0))
    ) {
      const e2 = peekExp((e) => {
        if (!expRunsOn(e, weekday) || areaName(e.location) !== dayArea)
          return false;
        const s = expStartTime(e, "14:30");
        return isFree(s, addMinutes(s, e.durationMinutes));
      });
      if (e2) addExp(e2, "14:30");
    }

    // fill the open morning / afternoon windows with area-matched stops
    if (isFree("09:30", "12:00")) {
      const a = peekAtt(
        (x) =>
          !attClosedOn(x, weekday) &&
          areaName(x.location) === morningArea &&
          isFree("09:30", addMinutes("09:30", x.avgVisitMinutes)),
      );
      if (a)
        addAtt(
          a,
          a.slug === "semenggoh-nature-reserve" ? semenggohStart("am") : "09:30",
        );
    }
    if (isFree("14:30", "17:00")) {
      const a = peekAtt(
        (x) =>
          !attClosedOn(x, weekday) &&
          areaName(x.location) === afternoonArea &&
          isFree("14:30", addMinutes("14:30", x.avgVisitMinutes)),
      );
      if (a)
        addAtt(
          a,
          a.slug === "semenggoh-nature-reserve" ? semenggohStart("pm") : "14:30",
        );
      else if (afternoonArea === CITY && (trip.pace === "relaxed" || !placedExp))
        addFixed(freeTime("14:30", "Free time in the old town"));
    }

    // lunch, if the midday window is open
    if (isFree("12:30", "13:30")) addFixed(mealItem("12:30", "lunch", trip));

    // make sure the traveller eats — unless a food experience covers dinner
    const dinnerCovered = items.some(
      (i) =>
        i.type === "experience" &&
        catsFor(i).includes("food") &&
        overlaps(i.startTime, i.endTime, "18:00", "21:00"),
    );
    if (!items.some((i) => i.type === "meal") && !dinnerCovered) {
      const slot = firstFreeSlot(
        occupied,
        ["19:00", "19:30", "18:30", "20:00", "13:00", "12:00", "20:30"],
        75,
      );
      if (slot)
        addFixed(mealItem(slot, slot >= "15:00" ? "dinner" : "lunch", trip));
    }

    // a packed CITY day earns an evening stop
    if (!excursion && trip.pace === "packed" && isFree("18:30", "20:30")) {
      const a = peekAtt(
        (x) =>
          !attClosedOn(x, weekday) &&
          areaName(x.location) === CITY &&
          isFree("18:30", addMinutes("18:30", x.avgVisitMinutes)),
      );
      if (a) addAtt(a, "18:30");
    }

    // transfers in and out of the excursion area
    if (excursion && TRAVEL[dayArea]) {
      const t = TRAVEL[dayArea];
      const areaItems = items.filter((i) => i.locationLabel === dayArea);
      if (areaItems.length) {
        const starts = areaItems.map((i) => i.startTime).sort();
        const ends = areaItems.map((i) => i.endTime).sort();
        const outStart = addMinutes(starts[0], -(t.minutes + 15));
        const backStart = ends[ends.length - 1];
        if (outStart >= "05:00")
          addFixed(
            transportItem(outStart, dayArea, t.minutes, t.groupCost, "out"),
          );
        if (
          backStart <= "18:30" &&
          isFree(backStart, addMinutes(backStart, t.minutes))
        )
          addFixed(
            transportItem(backStart, dayArea, t.minutes, t.groupCost, "back"),
          );
      }
    }

    // ---- day summary ----
    const headline =
      items.find((i) => i.type === "experience") ??
      items.find((i) => i.type === "attraction");
    let summary: string;
    if (excursion) {
      summary = headline
        ? `Day trip to ${dayArea} — ${headline.title}.`
        : `A day out around ${dayArea}.`;
    } else if (headline?.type === "experience") {
      summary = `${headline.title}, with time in the old town.`;
    } else {
      const themes = [
        ...new Set(items.flatMap((i) => catsFor(i)).map((c) => CAT_LABEL[c])),
      ].slice(0, 2);
      summary = themes.length
        ? `Kuching old town — ${themes.join(" and ")}.`
        : "Exploring Kuching's old town.";
    }

    prevExcursion = excursion;
    days.push({ dayNumber: d, date, summary, items: sortByTime(items) });
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
  const explicitDay = /day\s*\d|tomorrow|today|first day/i.test(text);
  const targets = new Set(targetDays(text, total));
  const notes: string[] = [];
  const px = pax(trip);

  const wantsCheaper = /cheap|budget|less expensive|save|afford/.test(text);

  // "make it cheaper" with no day named: trim only the single priciest day, so
  // it doesn't strip every bookable tour off the trip.
  if (wantsCheaper && !explicitDay) {
    const priciest = [...itinerary.days].sort(
      (a, b) =>
        b.items.reduce((s, i) => s + i.estimatedCost, 0) -
        a.items.reduce((s, i) => s + i.estimatedCost, 0),
    )[0];
    targets.clear();
    if (priciest) targets.add(priciest.dayNumber);
  }
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
