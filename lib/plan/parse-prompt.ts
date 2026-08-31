import type { CategorySlug } from "@/types/catalogue";
import type { GroupType, TripPace } from "@/types/trip";

export interface ParsedTrip {
  days?: number;
  budgetPerPerson?: number;
  groupType?: GroupType;
  numAdults?: number;
  numChildren?: number;
  interests?: CategorySlug[];
  pace?: TripPace;
}

const INTEREST_WORDS: Record<CategorySlug, RegExp> = {
  food: /\b(food|eat|eating|hawker|laksa|kolo mee|culinar|cuisine|restaurant|street food|foodie)\b/i,
  nature: /\b(nature|jungle|rainforest|national park|outdoors?|scenery|waterfall)\b/i,
  wildlife:
    /\b(wildlife|orangutan|proboscis|monkey|monkeys|animal|animals|bird|birds|dolphin)\b/i,
  culture: /\b(culture|cultural|local life|traditional|longhouse|indigenous|iban|bidayuh)\b/i,
  heritage: /\b(heritage|history|historic|museum|temple|fort|colonial|old town)\b/i,
  adventure: /\b(adventure|hike|hiking|trek|trekking|kayak|kayaking|climb|adrenaline)\b/i,
  shopping: /\b(shopping|shop|craft|crafts|souvenir|souvenirs|market|markets|pepper)\b/i,
};

function toNumber(raw: string): number {
  const s = raw.toLowerCase().replace(/,/g, "").trim();
  if (s.endsWith("k")) return Math.round(parseFloat(s) * 1000);
  return Math.round(parseFloat(s));
}

export function parseTripPrompt(text: string): ParsedTrip {
  const t = text.toLowerCase();
  const out: ParsedTrip = {};

  const days = t.match(/(\d+)\s*(?:-|\s)?\s*(day|night)/);
  if (days) {
    const n = parseInt(days[1], 10);
    out.days = days[2] === "night" ? n + 1 : n;
    out.days = Math.min(14, Math.max(1, out.days));
  }

  const budget = t.match(
    /(?:rm|myr|budget(?: of)?|around|about)\s*([\d,]+(?:\.\d+)?k?)/,
  );
  if (budget) {
    const n = toNumber(budget[1]);
    if (n > 0 && n < 1_000_000) out.budgetPerPerson = n;
  }

  const adults = t.match(/(\d+)\s*adults?/);
  if (adults) out.numAdults = Math.min(20, Math.max(1, parseInt(adults[1], 10)));
  const kids = t.match(/(\d+)\s*(?:kids?|child(?:ren)?)/);
  if (kids) out.numChildren = Math.min(20, parseInt(kids[1], 10));

  if (/\b(couple|honeymoon|partner|girlfriend|boyfriend|wife|husband|two of us)\b/.test(t)) {
    out.groupType = "couple";
    out.numAdults ??= 2;
  } else if (/\b(family|kids?|children|parents|grandparents)\b/.test(t)) {
    out.groupType = "family";
  } else if (/\b(friends|group of|mates|buddies)\b/.test(t)) {
    out.groupType = "friends";
  } else if (/\b(solo|alone|by myself|just me)\b/.test(t)) {
    out.groupType = "solo";
    out.numAdults ??= 1;
  } else if (/\b(business|work trip|conference|colleagues?)\b/.test(t)) {
    out.groupType = "business";
  }

  const interests: CategorySlug[] = [];
  for (const [slug, re] of Object.entries(INTEREST_WORDS) as [
    CategorySlug,
    RegExp,
  ][]) {
    if (re.test(text)) interests.push(slug);
  }
  if (interests.length) out.interests = interests;

  if (/\b(relax|relaxed|chill|slow|easy|leisurely|no rush)\b/.test(t)) {
    out.pace = "relaxed";
  } else if (/\b(packed|busy|as much as|lots to do|jam[- ]?packed|see everything)\b/.test(t)) {
    out.pace = "packed";
  }

  return out;
}
