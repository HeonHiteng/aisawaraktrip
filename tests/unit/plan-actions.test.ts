import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedTrip } from "@/lib/plan/parse-prompt";

/**
 * interpretPrompt (app/(app)/plan/actions.ts): Claude and Jev read the description side by side;
 * Claude's reading wins, then Jev's, then the rules'. Every AI call is faked.
 */

const state = vi.hoisted(() => ({
  claudeOn: false,
  jevOn: false,
  claude: null as unknown,
  jev: null as unknown,
  claudeCalls: 0,
  jevCalls: 0,
  limited: false,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("@/lib/auth", () => ({ requireUser: async () => ({ id: "u1" }) }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async () => (state.limited ? { ok: false, retryAfter: 30 } : { ok: true }),
}));
vi.mock("@/lib/ai/generate", () => ({ generateItinerary: async () => ({}) }));
vi.mock("@/lib/domain/trips", () => ({ createTrip: async () => ({ id: "t1" }) }));
vi.mock("@/lib/ai/claude", () => ({
  aiEnabled: () => state.claudeOn,
  readTripPrompt: async () => {
    state.claudeCalls++;
    return state.claude;
  },
}));
vi.mock("@/lib/ai/jev", () => ({
  jevEnabled: () => state.jevOn,
  interpretTripPrompt: async () => {
    state.jevCalls++;
    return state.jev;
  },
}));

import { interpretPrompt } from "@/app/(app)/plan/actions";

const TEXT = "5天行程，5个大人，一个小孩，budget rm1000";

beforeEach(() => {
  Object.assign(state, {
    claudeOn: false,
    jevOn: false,
    claude: null,
    jev: null,
    claudeCalls: 0,
    jevCalls: 0,
    limited: false,
  });
});

describe("interpretPrompt", () => {
  it("with no AI on, it returns the rules' reading without calling anything", async () => {
    const r = await interpretPrompt(TEXT);
    expect(r.source).toBe("rules");
    expect(r.parsed).toMatchObject({ days: 5, numAdults: 5, numChildren: 1 });
    expect(state.claudeCalls + state.jevCalls).toBe(0);
  });

  it("asks both, and Claude's reading wins", async () => {
    state.claudeOn = state.jevOn = true;
    state.claude = { days: 5, startDate: "2026-11-15" } satisfies ParsedTrip;
    state.jev = { groupType: "couple" } satisfies ParsedTrip;
    const r = await interpretPrompt(TEXT);
    expect(r).toEqual({ parsed: state.claude, source: "claude" });
    expect([state.claudeCalls, state.jevCalls]).toEqual([1, 1]);
  });

  it("uses Jev's reading when Claude fails, and the rules' when both do", async () => {
    state.claudeOn = state.jevOn = true;
    state.jev = { groupType: "family" } satisfies ParsedTrip;
    expect(await interpretPrompt(TEXT)).toEqual({ parsed: state.jev, source: "jev" });

    state.jev = null;
    const r = await interpretPrompt(TEXT);
    expect(r.source).toBe("rules");
    expect(r.parsed).toMatchObject({ days: 5 });
  });

  it("only calls the readers that are switched on", async () => {
    state.claudeOn = true;
    state.claude = { days: 3 } satisfies ParsedTrip;
    expect((await interpretPrompt(TEXT)).source).toBe("claude");
    expect([state.claudeCalls, state.jevCalls]).toEqual([1, 0]);
  });

  it("rate-limited or too short, it falls back to the rules without calling the AI", async () => {
    state.claudeOn = state.jevOn = true;
    state.limited = true;
    expect((await interpretPrompt(TEXT)).source).toBe("rules");
    state.limited = false;
    expect(await interpretPrompt("x")).toEqual({ parsed: {}, source: "rules" });
    expect(state.claudeCalls + state.jevCalls).toBe(0);
  });
});
