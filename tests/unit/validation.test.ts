import { describe, expect, it } from "vitest";
import { tripInputSchema } from "@/lib/validation/trip";
import { bookingInputSchema } from "@/lib/validation/booking";
import { experienceFormSchema, slugify } from "@/lib/validation/admin";
import { loginSchema, registerSchema } from "@/lib/validation/auth";

describe("tripInputSchema", () => {
  const base = {
    title: "Trip",
    startDate: "2026-09-20",
    endDate: "2026-09-23",
    budgetPerPerson: "1500",
    groupType: "couple",
    numAdults: "2",
    numChildren: "0",
    interests: ["food", "nature"],
    pace: "moderate",
    notes: "",
  };

  it("accepts a well-formed trip and coerces numbers", () => {
    const r = tripInputSchema.parse(base);
    expect(r.numAdults).toBe(2);
    expect(r.budgetPerPerson).toBe(1500);
  });

  it("rejects an end date before the start date", () => {
    expect(
      tripInputSchema.safeParse({ ...base, endDate: "2026-09-19" }).success,
    ).toBe(false);
  });

  it("rejects trips longer than 14 days", () => {
    expect(
      tripInputSchema.safeParse({ ...base, endDate: "2026-10-20" }).success,
    ).toBe(false);
  });

  it("requires at least one adult", () => {
    expect(
      tripInputSchema.safeParse({ ...base, numAdults: "0" }).success,
    ).toBe(false);
  });
});

describe("bookingInputSchema", () => {
  const base = {
    experienceId: "exp-foodwalk",
    tripId: null,
    bookingDate: "2026-09-25",
    startTime: "09:00",
    numAdults: "2",
    numChildren: "1",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    customerPhone: "",
    specialRequests: "",
  };

  it("accepts a valid booking", () => {
    expect(bookingInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a bad email", () => {
    expect(
      bookingInputSchema.safeParse({ ...base, customerEmail: "nope" }).success,
    ).toBe(false);
  });

  it("rejects a malformed time", () => {
    expect(
      bookingInputSchema.safeParse({ ...base, startTime: "9am" }).success,
    ).toBe(false);
  });
});

describe("experienceFormSchema", () => {
  const base = {
    title: "Sunset walk",
    summary: "",
    description: "",
    vendorId: "ven-foodwalks",
    locationId: "loc-city",
    durationMinutes: "120",
    pricePerPerson: "150",
    minPax: "2",
    maxPax: "10",
    categories: ["food"],
    meetingPoint: "",
    availabilityDays: ["sat", "sun"],
    availabilityTimes: "09:00",
    capacityPerSlot: "10",
    bookingLeadtimeHours: "24",
    languages: "English",
    includes: "",
    cancellationPolicy: "",
    images: "",
    isPublished: "on",
  };

  it("accepts a valid form and reads the published checkbox", () => {
    const r = experienceFormSchema.parse(base);
    expect(r.isPublished).toBe(true);
    expect(r.pricePerPerson).toBe(150);
  });

  it("rejects maxPax below minPax", () => {
    expect(
      experienceFormSchema.safeParse({ ...base, minPax: "10", maxPax: "2" })
        .success,
    ).toBe(false);
  });

  it("requires at least one category", () => {
    expect(
      experienceFormSchema.safeParse({ ...base, categories: [] }).success,
    ).toBe(false);
  });
});

describe("slugify", () => {
  it("makes a URL-safe slug", () => {
    expect(slugify("Sarawak Laksa & Kolo Mee!")).toBe("sarawak-laksa-kolo-mee");
    expect(slugify("  Trailing --- dashes  ")).toBe("trailing-dashes");
  });
});

describe("auth schemas", () => {
  it("login requires a valid email", () => {
    expect(loginSchema.safeParse({ email: "x", password: "y" }).success).toBe(
      false,
    );
  });
  it("register enforces an 8-char password", () => {
    expect(
      registerSchema.safeParse({
        fullName: "Jo",
        email: "jo@example.com",
        password: "short",
      }).success,
    ).toBe(false);
  });
});
