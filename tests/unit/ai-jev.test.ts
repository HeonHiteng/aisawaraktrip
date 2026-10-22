import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  interpretRefineIntent,
  interpretTripPrompt,
  JEV_MODEL,
  MAX_TARGET_DAYS,
  requestJevBrief,
  targetDayOptions,
  type JevClient,
} from "@/lib/ai/jev";
import { demoAttractions, demoExperiences } from "@/lib/demo/fixtures";
import { AVOID_SLUGS } from "@/lib/plan/parse-prompt";
import type { CategorySlug } from "@/types/catalogue";
import type { TripInput } from "@/types/trip";

/** Jev (TypeSafe) is faked: these tests cover the questions we send and how answers are folded. */

type Req = Parameters<JevClient["systemOne"]>[0];

const fake = (
  impl: (req: Req) => Promise<{ answers?: unknown }>,
): JevClient & { calls: { req: Req; signal?: AbortSignal }[] } => {
  const calls: { req: Req; signal?: AbortSignal }[] = [];
  return {
    calls,
    systemOne: async (req, opts) => {
      calls.push({ req, signal: opts?.signal });
      return impl(req);
    },
  };
};

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

const CATS: CategorySlug[] = ["nature", "wildlife", "culture", "heritage", "food", "adventure", "shopping"];
const sure = (choice: string, p = 0.9, confidence = 0.8) => ({ choice, probabilities: { [choice]: p }, confidence });

/** A "nothing stated" answer set, with overrides. */
function tripAnswers(over: Record<string, unknown> = {}) {
  const a: Record<string, unknown> = {
    group: sure("not_stated"),
    pace: sure("not_stated"),
    budget_band: sure("not_stated"),
  };
  for (const c of CATS) {
    a[`interest_${c}`] = { noul: 0.05 };
    a[`avoid_${c}`] = { noul: 0.05 };
  }
  for (const t of Object.keys(AVOID_SLUGS)) a[`avoid_${t}`] = { noul: 0.05 };
  return { ...a, ...over };
}

describe("interpretTripPrompt (A)", () => {
  const text = "5 days with my wife's parents and our toddler, nothing too strenuous, we adore orangutans";

  it("folds Jev's reading onto the rules: days from the rules, group / interests / vetoes from Jev", async () => {
    const c = fake(async () => ({
      answers: tripAnswers({
        group: sure("family", 0.85, 0.7),
        interest_wildlife: { noul: 0.95 },
        avoid_adventure: { noul: 0.9 },
      }),
    }));
    const p = await interpretTripPrompt(text, { client: c });
    expect(p?.days).toBe(5); // the rules' number
    expect(p?.groupType).toBe("family");
    expect(p?.numAdults).toBe(4); // the rules' head-count: me, my wife, her parents
    expect(p?.interests).toEqual(["wildlife"]);
    expect(p?.avoid?.categories).toEqual(["adventure"]);
  });

  it("sends the traveller's words as named state, with every question", async () => {
    const c = fake(async () => ({ answers: tripAnswers() }));
    await interpretTripPrompt(`  ${text}  `, { client: c });
    const { req, signal } = c.calls[0];
    expect(req.model).toBe(JEV_MODEL);
    expect(req.state).toEqual({ traveller_request: text });
    expect(Object.keys(req.questions)).toEqual(
      expect.arrayContaining([
        "group",
        "pace",
        "budget_band",
        ...CATS.map((c) => `interest_${c}`),
        ...CATS.map((c) => `avoid_${c}`),
        "avoid_boats",
        "avoid_museums",
        "avoid_temples",
        "avoid_cooking",
      ]),
    );
    expect(Object.keys(req.questions)).toHaveLength(3 + 7 + 7 + 4);
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("an unsure or not_stated choice never overrides the rules", async () => {
    const c = fake(async () => ({
      answers: tripAnswers({
        group: sure("solo", 0.45, 0.3), // not sure enough
        pace: sure("packed", 0.9, 0.2), // low confidence
      }),
    }));
    const p = await interpretTripPrompt("relaxed couple trip, 3 days", { client: c });
    expect(p?.groupType).toBe("couple");
    expect(p?.pace).toBe("relaxed");
    expect(p?.numAdults).toBe(2);
  });

  it("keeps the rules' interests when Jev finds none, and unions the vetoes", async () => {
    const c = fake(async () => ({ answers: tripAnswers({ avoid_boats: { noul: 0.92 } }) }));
    const p = await interpretTripPrompt("food and culture, no shopping please", { client: c });
    expect(p?.interests).toEqual(["food", "culture"]);
    expect(p?.avoid?.categories).toEqual(["shopping"]); // from the rules
    expect(p?.avoid?.slugs).toEqual([...AVOID_SLUGS.boats]); // from Jev
  });

  it("a spending level in words only fills the budget when there's no amount", async () => {
    const c = fake(async () => ({ answers: tripAnswers({ budget_band: sure("budget") }) }));
    expect((await interpretTripPrompt("cheap backpacker trip", { client: c }))?.budgetPerPerson).toBe(800);
    expect((await interpretTripPrompt("cheap trip, budget RM2000", { client: c }))?.budgetPerPerson).toBe(2000);
  });

  it("a vetoed category is not also an interest", async () => {
    const c = fake(async () => ({
      answers: tripAnswers({ interest_adventure: { noul: 0.8 }, interest_food: { noul: 0.8 }, avoid_adventure: { noul: 0.8 } }),
    }));
    expect((await interpretTripPrompt("food, and maybe not the hard treks", { client: c }))?.interests).toEqual(["food"]);
  });

  it("is null (→ the rules) on an error or a malformed answer", async () => {
    expect(await interpretTripPrompt(text, { client: fake(async () => { throw new Error("429"); }) })).toBeNull();
    expect(await interpretTripPrompt(text, { client: fake(async () => ({ answers: "nope" })) })).toBeNull();
    expect(await interpretTripPrompt(text, { client: fake(async () => ({ answers: { group: { choice: "aliens" } } })) })).toBeNull();
    expect(await interpretTripPrompt(text, { client: fake(async () => ({})) })).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("[jev]"), expect.anything());
  });
});

describe("interpretRefineIntent (B)", () => {
  const intentAnswers = (over: Record<string, unknown> = {}) => ({
    cheaper: { noul: 0.1 },
    more_food: { noul: 0.1 },
    no_outdoor: { noul: 0.1 },
    relax: { noul: 0.1 },
    culture: { noul: 0.1 },
    target_day: sure("not_specified"),
    ...over,
  });

  it("reads the change and the day", async () => {
    const c = fake(async () => ({ answers: intentAnswers({ cheaper: { noul: 0.9 }, target_day: sure("day_2", 0.8) }) }));
    expect(await interpretRefineIntent("the second day is too pricey for us", 3, { client: c })).toEqual({
      cheaper: true,
      moreFood: false,
      noOutdoor: false,
      relax: false,
      culture: false,
      targetDay: 2,
    });
    expect(c.calls[0].req.state).toEqual({ edit_request: "the second day is too pricey for us", trip_days: 3 });
  });

  it("an unsure day or the whole trip means every day", async () => {
    const unsure = fake(async () => ({ answers: intentAnswers({ relax: { noul: 0.7 }, target_day: sure("day_1", 0.4) }) }));
    expect((await interpretRefineIntent("ease off a bit", 3, { client: unsure }))?.targetDay).toBeNull();
    const whole = fake(async () => ({ answers: intentAnswers({ relax: { noul: 0.7 }, target_day: sure("whole_trip") }) }));
    expect((await interpretRefineIntent("ease off", 3, { client: whole }))?.targetDay).toBeNull();
    const outOfRange = fake(async () => ({ answers: intentAnswers({ relax: { noul: 0.7 }, target_day: sure("day_9") }) }));
    expect((await interpretRefineIntent("ease off", 3, { client: outOfRange }))?.targetDay).toBeNull();
  });

  it("is null when nothing clears the bar, or on an error", async () => {
    expect(await interpretRefineIntent("blorp", 3, { client: fake(async () => ({ answers: intentAnswers({ cheaper: { noul: 0.59 } }) })) })).toBeNull();
    expect(await interpretRefineIntent("x", 3, { client: fake(async () => { throw new Error("timeout"); }) })).toBeNull();
    expect(await interpretRefineIntent("x", 3, { client: fake(async () => ({ answers: null })) })).toBeNull();
  });

  it("offers one option per day (capped at 14) plus whole_trip and not_specified", () => {
    expect(Object.keys(targetDayOptions(3))).toEqual(["day_1", "day_2", "day_3", "whole_trip", "not_specified"]);
    expect(Object.keys(targetDayOptions(20))).toHaveLength(MAX_TARGET_DAYS + 2);
    expect(targetDayOptions(3).day_2).toMatch(/tomorrow/);
    expect(targetDayOptions(3).day_3).toMatch(/last day/);
  });
});

describe("requestJevBrief (C)", () => {
  const trip: TripInput = {
    title: "t",
    startDate: "2026-10-20",
    endDate: "2026-10-22",
    budgetPerPerson: null,
    groupType: "family",
    numAdults: 2,
    numChildren: 2,
    interests: ["wildlife"],
    pace: "relaxed",
    notes: "my mother can't walk far",
    prompt: "family trip, no trekking, love wildlife",
  };
  const [e1, e2] = demoExperiences;
  const [a1, a2] = demoAttractions;
  const candidates = { experiences: [e1, e2], attractions: [a1, a2] };
  const titleOf = (req: Req) => (req.state.candidate as { title: string }).title;

  /** Answer by candidate title. */
  const scorer = (byTitle: Record<string, { fit?: number; conflict?: number } | "fail">) =>
    fake(async (req) => {
      const s = byTitle[titleOf(req)];
      if (s === "fail" || !s) throw new Error("503");
      return { answers: { fit: { score: s.fit }, conflict: { noul: s.conflict ?? 0.02 }, preferSlugs: ["atlantis"] } };
    });

  it("vetoes clear conflicts and ranks good fits first, best first", async () => {
    const c = scorer({
      [e1.title]: { fit: 3.8 },
      [e2.title]: { fit: 1.2 },
      [a1.name]: { fit: 2.5 },
      [a2.name]: { fit: 3.9, conflict: 0.95 },
    });
    const b = await requestJevBrief(trip, candidates, { client: c });
    expect(b).toEqual({ avoidSlugs: [a2.slug], avoidCategories: [], preferSlugs: [e1.slug, a1.slug], reasons: {} });
    expect(c.calls).toHaveLength(4);
  });

  it("sends the traveller and one candidate as state, sharing one deadline", async () => {
    const c = scorer({ [e1.title]: { fit: 3 }, [e2.title]: { fit: 3 }, [a1.name]: { fit: 3 }, [a2.name]: { fit: 3 } });
    await requestJevBrief(trip, candidates, { client: c });
    const { req } = c.calls[0];
    expect(req.model).toBe(JEV_MODEL);
    expect(Object.keys(req.questions).sort()).toEqual(["conflict", "fit"]);
    const traveller = req.state.traveller as Record<string, unknown>;
    expect(traveller.own_words).toEqual({ trip_request: trip.prompt, notes: trip.notes });
    expect(traveller).toMatchObject({ group: "family", adults: 2, children: 2, budget_per_person: "not stated", days: 3 });
    expect(req.state.candidate).toMatchObject({ kind: "experience", title: e1.title, price: `RM${e1.pricePerPerson} per person` });
    expect(new Set(c.calls.map((x) => x.signal)).size).toBe(1);
  });

  it("skips a candidate whose request failed or answered nonsense, and still returns a brief", async () => {
    const c = scorer({ [e1.title]: { fit: 3 }, [e2.title]: "fail", [a1.name]: { fit: 7 }, [a2.name]: { fit: 2.2 } });
    const b = await requestJevBrief(trip, candidates, { client: c });
    expect(b?.preferSlugs).toEqual([e1.slug, a2.slug]);
  });

  it("is null when more than half the candidates failed", async () => {
    const c = scorer({ [e1.title]: { fit: 3 }, [e2.title]: "fail", [a1.name]: "fail", [a2.name]: "fail" });
    expect(await requestJevBrief(trip, candidates, { client: c })).toBeNull();
    expect(await requestJevBrief(trip, { experiences: [], attractions: [] }, { client: c })).toBeNull();
  });

  it("only ever names the candidates it was given — nothing in an answer can add a place", async () => {
    const c = scorer({ [e1.title]: { fit: 4 }, [e2.title]: { fit: 4 }, [a1.name]: { fit: 4 }, [a2.name]: { fit: 4 } });
    const b = await requestJevBrief(trip, candidates, { client: c });
    const allowed = new Set([e1.slug, e2.slug, a1.slug, a2.slug]);
    for (const s of [...b!.avoidSlugs, ...b!.preferSlugs]) expect(allowed.has(s)).toBe(true);
    expect(b!.preferSlugs).not.toContain("atlantis");
  });
});
