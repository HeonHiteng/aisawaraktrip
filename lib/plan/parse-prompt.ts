import type { CategorySlug } from "@/types/catalogue";
import type { GroupType, TripPace } from "@/types/trip";

export interface ParsedTrip {
  days?: number;
  /** First day (yyyy-mm-dd), when the traveller named one. Only Claude reads dates (lib/ai/claude.ts). */
  startDate?: string;
  budgetPerPerson?: number;
  groupType?: GroupType;
  numAdults?: number;
  numChildren?: number;
  interests?: CategorySlug[];
  pace?: TripPace;
  /** Things the traveller asked NOT to include (from free-text notes). */
  avoid?: { categories: CategorySlug[]; slugs: string[] };
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

/** The same seven interests in Chinese (no \b here: CJK text has no word boundaries). */
const CN_INTEREST_WORDS: Record<CategorySlug, RegExp> = {
  food: /美食|好吃|小吃|吃货|叻沙|哥罗面|干盘面|餐厅|夜市/,
  nature: /自然|雨林|国家公园|瀑布|风景|森林|郊外/,
  wildlife: /野生动物|红毛猩猩|猩猩|长鼻猴|猴子|动物|观鸟|海豚/,
  culture: /文化|长屋|原住民|伊班|比达友|传统|民俗/,
  heritage: /历史|古迹|博物馆|寺庙|庙宇|古堡|老街|古城/,
  adventure: /徒步|爬山|登山|健行|探险|皮划艇|攀岩|刺激/,
  shopping: /购物|逛街|手信|纪念品|伴手礼|市场|胡椒/,
};

const CN_DIGITS: Record<string, number> = {
  零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 俩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};
const CN_UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

/** "5", "五", "十二", "两千五" (2500), "1.5万", "2k" -> a number; NaN when it isn't one. */
export function cnNumber(raw: string): number {
  const s = raw.trim().toLowerCase().replace(/,/g, "");
  if (!s) return NaN;
  const arabic = s.match(/^(\d+(?:\.\d+)?)\s*(k|千|万)?$/);
  if (arabic) {
    const unit = arabic[2] === "万" ? 10_000 : arabic[2] ? 1000 : 1;
    return parseFloat(arabic[1]) * unit;
  }
  let total = 0;
  let section = 0;
  let digit = -1;
  let lastUnit = 0;
  for (const ch of s) {
    if (ch === "零" || ch === "〇") {
      lastUnit = 1; // "一千零五" = 1005: a digit after 零 is just a digit
    } else if (ch in CN_DIGITS) {
      digit = CN_DIGITS[ch];
    } else if (ch in CN_UNITS) {
      section += (digit < 0 ? 1 : digit) * CN_UNITS[ch];
      digit = -1;
      lastUnit = CN_UNITS[ch];
    } else if (ch === "万") {
      total += (section + Math.max(digit, 0)) * 10_000;
      section = 0;
      digit = -1;
      lastUnit = 10_000;
    } else {
      return NaN;
    }
  }
  // spoken shorthand: "两千五" is 2500 and "三万五" 35000 (a trailing digit is one unit down)
  if (digit >= 0) section += lastUnit >= 100 ? (digit * lastUnit) / 10 : digit;
  return total + section;
}

const CN_NUM = String.raw`(\d+|[零〇一二两俩三四五六七八九十]+)`;
const CN_MONEY = String.raw`(\d+(?:\.\d+)?\s*(?:k|千|万)?|[零〇一二两俩三四五六七八九十百千万]+)`;
/** "5天" / "五日游" — but not "第二天" (the second day) or "15日出发" (a date). */
const CN_DAYS = new RegExp(String.raw`(?<!第)${CN_NUM}\s*(?:天|日(?=游))`);
const CN_NIGHTS = new RegExp(String.raw`(?<!第)${CN_NUM}\s*(?:夜|晚)`);
const CN_ADULTS = new RegExp(String.raw`${CN_NUM}\s*(?:个|位|名)?\s*(?:大人|成人|成年人)`);
const CN_KIDS = new RegExp(String.raw`${CN_NUM}\s*(?:个|位|名)?\s*(?:小孩|孩子|儿童|小朋友|小童|宝宝)`);
/** "预算每人一千" / "人均RM800" / "总预算四千马币": group 1 marks a total, group 2 is the amount. */
const CN_BUDGET = new RegExp(
  String.raw`(总|一共|全部)?(?:预算|人均|每人|每个人|每位)[^\d零〇一二两俩三四五六七八九十]{0,6}?(?:rm|myr)?\s*${CN_MONEY}`,
);
/** "四千马币" with no budget word: group 1 is the amount. */
const CN_RINGGIT = new RegExp(String.raw`${CN_MONEY}\s*(?:马币|令吉)`);

function cnCount(re: RegExp, t: string): number | null {
  const m = t.match(re);
  if (!m) return null;
  const n = cnNumber(m[1]);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toNumber(raw: string): number {
  const s = raw.toLowerCase().replace(/,/g, "").trim();
  if (s.endsWith("k")) return Math.round(parseFloat(s) * 1000);
  return Math.round(parseFloat(s));
}

const NEGATION =
  /\b(no|not into|without|skip(?:ping)?|avoid(?:ing)?|hate|rather not|don'?t (?:like|want|do)|we don'?t|less)\b/i;

/** Specific places a traveller can rule out by kind ("no boats"), shared with lib/ai/jev.ts. */
export const AVOID_SLUGS = {
  boats: [
    "santubong-sunset-wildlife-river-cruise",
    "sarawak-kiri-river-kayaking-semadang",
    "bako-national-park",
    "bako-national-park-full-day-trek",
  ],
  museums: ["borneo-cultures-museum"],
  temples: ["tua-pek-kong-temple"],
  cooking: ["sarawak-laksa-kolo-mee-cooking-class"],
} as const satisfies Record<string, readonly string[]>;

/** Phrase -> what to leave out. Only applied inside a clause that also negates. */
const AVOID_MAP: { re: RegExp; categories?: CategorySlug[]; slugs?: readonly string[] }[] = [
  { re: /shopping|souvenirs?|handicrafts?/, categories: ["shopping"] },
  { re: /wildlife|animals?|monkeys?|orang.?utans?/, categories: ["wildlife"] },
  {
    re: /hik(?:e|es|ing)|trek(?:k?ing|s)?|strenuous|long walks?|steep/,
    categories: ["adventure"],
  },
  { re: /museums?/, slugs: AVOID_SLUGS.museums },
  { re: /temples?/, slugs: AVOID_SLUGS.temples },
  { re: /boats?|cruises?|kayak(?:ing)?|water/, slugs: AVOID_SLUGS.boats },
  { re: /cooking class(?:es)?/, slugs: AVOID_SLUGS.cooking },
];

const CN_NEGATION = /不要|不想|不去|不用|不喜欢|讨厌|怕|不能|避开|跳过|别|没兴趣|不感兴趣|免了/;

/** The same vetoes in Chinese ("不要爬山", "怕坐船", "不能走太多路"). */
const CN_AVOID_MAP: typeof AVOID_MAP = [
  { re: /购物|逛街|手信|纪念品|伴手礼/, categories: ["shopping"] },
  { re: /动物|猴子|猩猩/, categories: ["wildlife"] },
  { re: /爬山|登山|徒步|健行|走太多路|走很多路|走远路|走太久|太累/, categories: ["adventure"] },
  { re: /博物馆/, slugs: AVOID_SLUGS.museums },
  { re: /庙|寺/, slugs: AVOID_SLUGS.temples },
  { re: /船|游河|皮划艇|划艇|水上|下水/, slugs: AVOID_SLUGS.boats },
  { re: /烹饪课|厨艺课|学做菜/, slugs: AVOID_SLUGS.cooking },
];

function parseAvoid(text: string): { categories: CategorySlug[]; slugs: string[] } {
  const categories = new Set<CategorySlug>();
  const slugs = new Set<string>();
  const clauses = text.toLowerCase().split(/[,.;!?，。；！？、]|\band\b|\bbut\b|但是?|不过/);
  for (const clause of clauses) {
    const rules = [
      ...(NEGATION.test(clause) ? AVOID_MAP : []),
      ...(CN_NEGATION.test(clause) ? CN_AVOID_MAP : []),
    ];
    for (const entry of rules) {
      if (!entry.re.test(clause)) continue;
      entry.categories?.forEach((c) => categories.add(c));
      entry.slugs?.forEach((s) => slugs.add(s));
    }
  }
  return { categories: [...categories], slugs: [...slugs] };
}

const SPOUSE = /\bmy (?:wife|husband|partner|girlfriend|boyfriend)\b/;
/** Two people at once: "my parents", "my wife's parents", "mum and dad", "in-laws". */
const ELDER_PAIRS =
  /\b(?:my (?:(?:wife|husband|partner|girlfriend|boyfriend)'?s )?(?:parents|folks|grandparents)|(?:mum|mom|mother) and (?:dad|father)|in-?laws)\b/g;
const ELDER_ONE = /\bmy (?:mum|mom|mother|dad|father|grandma|grandmother|grandpa|grandfather)\b/g;

/**
 * Adults named beside the writer ("with my parents" = 3: me + two). The writer counts as one.
 * `elders` = an older generation is coming, which makes it a family trip even with a spouse along.
 */
function partyOf(t: string): { adults: number; elders: boolean } | null {
  const pairs = t.match(ELDER_PAIRS)?.length ?? 0;
  const ones = t.replace(ELDER_PAIRS, " ").match(ELDER_ONE)?.length ?? 0;
  const spouse = SPOUSE.test(t) ? 1 : 0;
  if (!pairs && !ones && !spouse) return null;
  return { adults: Math.min(20, 1 + spouse + 2 * pairs + ones), elders: pairs + ones > 0 };
}

export function parseTripPrompt(text: string): ParsedTrip {
  const t = text.toLowerCase();
  const out: ParsedTrip = {};

  const days = t.match(/(\d+)\s*(?:-|\s)?\s*(day|night)/);
  if (days) {
    const n = parseInt(days[1], 10);
    out.days = days[2] === "night" ? n + 1 : n;
  } else {
    // "5天4夜" counts the days; "住3晚" alone means 4 days
    const cnDays = cnCount(CN_DAYS, t);
    const cnNights = cnCount(CN_NIGHTS, t);
    if (cnDays) out.days = cnDays;
    else if (cnNights) out.days = cnNights + 1;
  }
  if (out.days) out.days = Math.min(14, Math.max(1, out.days));

  // A Chinese budget phrase also says per person or for everyone; a total is split after head-count.
  let budgetIsTotal = false;
  const cnBudget = t.match(CN_BUDGET);
  const cnRinggit = cnBudget ? null : t.match(CN_RINGGIT);
  const cnAmount = cnBudget ? cnBudget[2] : cnRinggit?.[1];
  if (cnAmount) {
    const n = Math.round(cnNumber(cnAmount));
    if (n > 0 && n < 1_000_000) {
      out.budgetPerPerson = n;
      budgetIsTotal = Boolean(cnBudget?.[1]);
    }
  }
  const budget = out.budgetPerPerson
    ? null
    : t.match(/(?:rm|myr|budget(?: of)?|around|about)\s*([\d,]+(?:\.\d+)?k?)/);
  if (budget) {
    const n = toNumber(budget[1]);
    if (n > 0 && n < 1_000_000) out.budgetPerPerson = n;
  }

  const adults = t.match(/(\d+)\s*adults?/);
  if (adults) out.numAdults = Math.min(20, Math.max(1, parseInt(adults[1], 10)));
  const kids = t.match(/(\d+)\s*(?:kids?|child(?:ren)?)/);
  if (kids) out.numChildren = Math.min(20, parseInt(kids[1], 10));
  const cnAdults = adults ? null : cnCount(CN_ADULTS, t);
  if (cnAdults) out.numAdults = Math.min(20, Math.max(1, cnAdults));
  const cnKids = kids ? null : cnCount(CN_KIDS, t);
  if (cnKids != null) out.numChildren = Math.min(20, cnKids);

  const party = partyOf(t);
  if (party && !adults) out.numAdults = party.adults;

  if (party?.elders) {
    out.groupType = "family";
  } else if (/\b(couple|honeymoon|partner|girlfriend|boyfriend|wife|husband|two of us)\b/.test(t)) {
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
  } else if (cnKids || /家庭|全家|一家|家人|父母|爸妈|老人|长辈|小孩|孩子|儿童|小朋友|宝宝/.test(t)) {
    out.groupType = "family";
  } else if (/情侣|夫妻|夫妇|蜜月|老婆|老公|男朋友|女朋友|男友|女友|另一半|两口子/.test(t)) {
    out.groupType = "couple";
    out.numAdults ??= 2;
  } else if (/朋友|同学|闺蜜|哥们|兄弟/.test(t)) {
    out.groupType = "friends";
  } else if (/独自|独游|一个人(?:去|旅|玩|出)/.test(t)) {
    out.groupType = "solo";
    out.numAdults ??= 1;
  } else if (/出差|商务|同事|开会/.test(t)) {
    out.groupType = "business";
  }

  // "总预算四千" for 2 adults + 2 kids is RM1000 each
  if (budgetIsTotal && out.budgetPerPerson && out.numAdults) {
    out.budgetPerPerson = Math.round(out.budgetPerPerson / (out.numAdults + (out.numChildren ?? 0)));
  }

  const interests: CategorySlug[] = [];
  for (const [slug, re] of Object.entries(INTEREST_WORDS) as [
    CategorySlug,
    RegExp,
  ][]) {
    if (re.test(text) || CN_INTEREST_WORDS[slug].test(text)) interests.push(slug);
  }
  if (interests.length) out.interests = interests;

  if (/\b(relax|relaxed|chill|slow|easy|leisurely|no rush)\b/.test(t)) {
    out.pace = "relaxed";
  } else if (/\b(packed|busy|as much as|lots to do|jam[- ]?packed|see everything)\b/.test(t)) {
    out.pace = "packed";
  } else if (/轻松|悠闲|慢慢|慢游|不赶|休闲|放松|佛系/.test(t)) {
    out.pace = "relaxed";
  } else if (/紧凑|满满|排满|多去|特种兵/.test(t)) {
    out.pace = "packed";
  }

  const avoid = parseAvoid(text);
  if (avoid.categories.length || avoid.slugs.length) out.avoid = avoid;

  // "no shopping" shouldn't also register shopping as a positive interest.
  if (out.interests && avoid.categories.length) {
    out.interests = out.interests.filter(
      (i) => !avoid.categories.includes(i),
    );
    if (!out.interests.length) delete out.interests;
  }

  return out;
}
