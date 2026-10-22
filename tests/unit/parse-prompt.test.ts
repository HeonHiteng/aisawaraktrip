import { describe, expect, it } from "vitest";
import { AVOID_SLUGS, cnNumber, parseTripPrompt } from "@/lib/plan/parse-prompt";

describe("parseTripPrompt — Chinese", () => {
  it("reads the descriptions travellers actually typed", () => {
    const party = { days: 5, numAdults: 5, numChildren: 1, groupType: "family" };
    // "/ person" says per person; a bare amount is the whole group's, so six people share RM1,000
    expect(parseTripPrompt("5天4夜，5个大人一个小孩的trip，budget在RM1000 / person")).toMatchObject({
      ...party,
      budgetPerPerson: 1000,
    });
    expect(parseTripPrompt("5天行程，5个大人，一个小孩，budget rm1000")).toMatchObject({ ...party, budgetPerPerson: 167 });
    // a child's age between the count and the word
    expect(
      parseTripPrompt("我想要sarawak 5天4夜的trip，你能给我推荐吗？预算大概rm3000，5个大人，1个9岁小孩"),
    ).toMatchObject({ ...party, budgetPerPerson: 500 });
  });

  it("an amount is the group's total unless it's said to be per person", () => {
    expect(parseTripPrompt("RM800 each, 4 friends")).toMatchObject({ numAdults: 4, budgetPerPerson: 800 });
    expect(parseTripPrompt("4 friends, RM800 pp").budgetPerPerson).toBe(800);
    expect(parseTripPrompt("4 friends, RM800 per person").budgetPerPerson).toBe(800);
    expect(parseTripPrompt("我们4个friends，每人预算800").budgetPerPerson).toBe(800);
    expect(parseTripPrompt("6 pax including 2 kids, budget RM3000")).toMatchObject({
      numAdults: 4,
      numChildren: 2,
      budgetPerPerson: 500,
    });
    // no head-count in the text: handed to the form to split across its travellers
    const r = parseTripPrompt("cheap trip, budget RM2000");
    expect(r.budgetTotal).toBe(2000);
    expect(r.budgetPerPerson).toBeUndefined();
  });

  it("counts days, then nights + 1, and ignores 'the second day' and dates", () => {
    expect(parseTripPrompt("三天两夜").days).toBe(3);
    expect(parseTripPrompt("住3晚").days).toBe(4);
    expect(parseTripPrompt("五日游").days).toBe(5);
    expect(parseTripPrompt("第二天想轻松一点").days).toBeUndefined();
    expect(parseTripPrompt("11月15日出发").days).toBeUndefined();
  });

  it("splits a total budget across the travellers, and reads Chinese amounts", () => {
    expect(parseTripPrompt("三天两夜，两夫妻，总预算四千马币")).toMatchObject({
      days: 3,
      groupType: "couple",
      numAdults: 2,
      budgetPerPerson: 2000,
    });
    expect(parseTripPrompt("2个大人2个小孩，人均两千五").budgetPerPerson).toBe(2500);
    expect(parseTripPrompt("预算每人大概RM800").budgetPerPerson).toBe(800);
  });

  it("reads group, pace, interests and vetoes", () => {
    const r = parseTripPrompt("一家人，轻松一点，喜欢看猩猩和美食，不要爬山，怕坐船");
    expect(r).toMatchObject({ groupType: "family", pace: "relaxed" });
    expect(r.interests).toEqual(expect.arrayContaining(["wildlife", "food"]));
    expect(r.interests).not.toContain("adventure");
    expect(r.avoid?.categories).toEqual(["adventure"]);
    expect(r.avoid?.slugs).toEqual([...AVOID_SLUGS.boats]);
    expect(parseTripPrompt("和朋友去，行程紧凑").groupType).toBe("friends");
    expect(parseTripPrompt("和朋友去，行程紧凑").pace).toBe("packed");
  });

  it("cnNumber reads digits, Chinese numerals and spoken shorthand", () => {
    const cases: [string, number][] = [
      ["5", 5], ["五", 5], ["十", 10], ["十二", 12], ["二十一", 21], ["两千五", 2500],
      ["三万五", 35_000], ["一千零五", 1005], ["1.5万", 15_000], ["2k", 2000],
    ];
    for (const [raw, n] of cases) expect(cnNumber(raw), raw).toBe(n);
    expect(cnNumber("abc")).toBeNaN();
    expect(cnNumber("")).toBeNaN();
  });
});

describe("parseTripPrompt", () => {
  it("parses the canonical example", () => {
    const r = parseTripPrompt(
      "3 days in Kuching, RM1,500, couple, interested in food + nature",
    );
    expect(r.days).toBe(3);
    expect(r.budgetPerPerson).toBe(750); // RM1,500 for the couple
    expect(r.groupType).toBe("couple");
    expect(r.numAdults).toBe(2);
    expect(r.interests).toEqual(expect.arrayContaining(["food", "nature"]));
  });

  it("understands nights, k-budgets and family", () => {
    const r = parseTripPrompt(
      "family trip, 4 nights, budget around 2k per person, 2 adults 2 kids, love wildlife and adventure",
    );
    expect(r.days).toBe(5);
    expect(r.budgetPerPerson).toBe(2000);
    expect(r.groupType).toBe("family");
    expect(r.numAdults).toBe(2);
    expect(r.numChildren).toBe(2);
    expect(r.interests).toEqual(
      expect.arrayContaining(["wildlife", "adventure"]),
    );
  });

  it("detects solo + relaxed pace", () => {
    const r = parseTripPrompt("solo, want a relaxed week exploring heritage");
    expect(r.groupType).toBe("solo");
    expect(r.numAdults).toBe(1);
    expect(r.pace).toBe("relaxed");
    expect(r.interests).toContain("heritage");
  });

  it("returns an empty object for an unparseable prompt", () => {
    expect(parseTripPrompt("hello there")).toEqual({});
  });

  it("caps trip length at 14 days", () => {
    expect(parseTripPrompt("30 days in Sarawak").days).toBe(14);
  });

  it("extracts avoidances from negated clauses", () => {
    const r = parseTripPrompt(
      "3 days, love food, but no museums and we hate hiking",
    );
    expect(r.avoid?.slugs).toContain("borneo-cultures-museum");
    expect(r.avoid?.categories).toContain("adventure");
    // the positive interest still comes through
    expect(r.interests).toContain("food");
  });

  it("does not treat 'no rush' as an avoidance", () => {
    const r = parseTripPrompt("no rush, we love food and shopping");
    expect(r.avoid).toBeUndefined();
    expect(r.interests).toEqual(expect.arrayContaining(["food", "shopping"]));
  });

  it("maps 'not into shopping' to a category avoidance", () => {
    const r = parseTripPrompt("relaxed trip, not into shopping or markets");
    expect(r.avoid?.categories).toContain("shopping");
  });

  it("counts the writer plus the people they name", () => {
    const parents = parseTripPrompt("5 days with my parents, love food and culture, no boats");
    expect(parents).toMatchObject({ groupType: "family", numAdults: 3 });
    // the spouse and both of her parents: an older generation makes it a family trip
    expect(parseTripPrompt("with my wife's parents and our toddler")).toMatchObject({
      groupType: "family",
      numAdults: 4,
    });
    expect(parseTripPrompt("taking my mum and dad")).toMatchObject({ numAdults: 3 });
    expect(parseTripPrompt("me, my husband and my mother")).toMatchObject({ groupType: "family", numAdults: 3 });
    expect(parseTripPrompt("honeymoon with my wife")).toMatchObject({ groupType: "couple", numAdults: 2 });
  });

  it("an explicit adult count wins over the people named", () => {
    expect(parseTripPrompt("with my parents, 4 adults").numAdults).toBe(4);
  });
});
