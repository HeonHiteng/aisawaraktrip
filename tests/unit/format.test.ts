import { describe, expect, it } from "vitest";
import {
  formatDateRange,
  formatDays,
  formatDuration,
  formatMYR,
  weekdayKey,
} from "@/lib/format";
import { tripNights } from "@/types/trip";

// Intl currency/date formatting inserts non-breaking / narrow spaces.
const norm = (s: string) => s.replace(/[   ]/g, " ");

describe("formatMYR", () => {
  it("shows whole ringgit without decimals", () => {
    expect(norm(formatMYR(150))).toBe("RM 150");
  });
  it("shows decimals when needed", () => {
    expect(norm(formatMYR(21.6))).toBe("RM 21.60");
  });
});

describe("formatDuration", () => {
  it("minutes under an hour", () => {
    expect(formatDuration(45)).toBe("45 min");
  });
  it("whole hours", () => {
    expect(formatDuration(180)).toBe("3 hr");
  });
  it("hours and minutes", () => {
    expect(formatDuration(210)).toBe("3 hr 30 min");
  });
});

describe("formatDays", () => {
  it("collapses a full week to Daily", () => {
    expect(formatDays(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).toBe(
      "Daily",
    );
  });
  it("lists partial weeks", () => {
    expect(formatDays(["tue", "wed", "thu"])).toBe("Tue, Wed, Thu");
  });
});

describe("tripNights", () => {
  it("counts inclusive days", () => {
    expect(tripNights({ startDate: "2026-09-20", endDate: "2026-09-22" })).toBe(3);
    expect(tripNights({ startDate: "2026-09-20", endDate: "2026-09-20" })).toBe(1);
  });
});

describe("weekdayKey + formatDateRange", () => {
  it("maps an ISO date to a weekday key", () => {
    expect(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]).toContain(
      weekdayKey("2026-09-20"),
    );
  });
  it("formats a same-month range compactly", () => {
    expect(norm(formatDateRange("2026-09-20", "2026-09-23"))).toBe(
      "20–23 Sept 2026",
    );
  });
});
