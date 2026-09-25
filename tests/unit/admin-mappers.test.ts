import { describe, expect, it } from "vitest";
import {
  adminVendorFromRow,
  attractionFormToRpc,
  experienceFormToRpc,
  parseList,
  vendorFormToRpc,
  type AdminVendorRow,
} from "@/lib/domain/mappers/admin";
import type {
  AttractionForm,
  ExperienceForm,
  VendorForm,
} from "@/lib/validation/admin";

const expForm = (over: Partial<ExperienceForm> = {}): ExperienceForm => ({
  title: "Sunset Cruise!",
  summary: "s",
  description: "d",
  vendorId: "v",
  locationId: "l",
  durationMinutes: 120,
  pricePerPerson: 99,
  minPax: 1,
  maxPax: 8,
  categories: ["nature"],
  meetingPoint: "jetty",
  availabilityDays: ["mon", "tue"],
  availabilityTimes: "09:00, 14:00\n16:30",
  capacityPerSlot: 8,
  bookingLeadtimeHours: 24,
  languages: "",
  includes: "Guide, Water\nSnacks",
  cancellationPolicy: "",
  images: "/a.jpg\n/b.jpg, /c.jpg",
  isPublished: true,
  ...over,
});

describe("parseList", () => {
  it("splits on commas and newlines, trims, drops blanks", () => {
    expect(parseList(" a, b\n\n c ,, ")).toEqual(["a", "b", "c"]);
    expect(parseList("")).toEqual([]);
  });
});

describe("experienceFormToRpc", () => {
  it("normalises the form into what admin_save_experience reads", () => {
    const p = experienceFormToRpc(expForm()) as Record<string, unknown>;
    expect(p).toMatchObject({
      id: null,
      slugBase: "sunset-cruise",
      title: "Sunset Cruise!",
      languages: ["English"], // empty -> default
      cancellationPolicy: "Free cancellation up to 24 hours before start.", // empty -> default
      includes: ["Guide", "Water", "Snacks"],
      images: ["/a.jpg", "/b.jpg", "/c.jpg"],
      categories: ["nature"],
      availability: { days: ["mon", "tue"], times: ["09:00", "14:00", "16:30"], capacity_per_slot: 8 },
      isPublished: true,
    });
  });

  it("keeps the id for edits, explicit values over defaults, and never yields an empty slug", () => {
    const p = experienceFormToRpc(expForm({ id: "abc", languages: "English, Malay", cancellationPolicy: "None", title: "露营" })) as Record<string, unknown>;
    expect(p).toMatchObject({ id: "abc", languages: ["English", "Malay"], cancellationPolicy: "None", slugBase: "experience" });
  });
});

describe("attractionFormToRpc", () => {
  const form: AttractionForm = {
    name: "Old Fort",
    summary: "",
    description: "",
    locationId: "l",
    address: "",
    avgVisitMinutes: 60,
    priceMin: 20,
    priceMax: 30,
    isFree: false,
    categories: ["heritage"],
    tips: "",
    images: "/x.jpg",
    isPublished: false,
  };

  it("maps fields and slugifies the name", () => {
    expect(attractionFormToRpc(form)).toMatchObject({ slugBase: "old-fort", priceMin: 20, priceMax: 30, images: ["/x.jpg"] });
  });

  it("a free attraction has no price, whatever the price fields still say", () => {
    expect(attractionFormToRpc({ ...form, isFree: true })).toMatchObject({ isFree: true, priceMin: 0, priceMax: 0 });
  });
});

describe("vendorFormToRpc / adminVendorFromRow", () => {
  const form: VendorForm = {
    name: "Kuching Food Walks",
    description: "d",
    locationName: "Kuching City Centre",
    contactEmail: "a@b.test",
    contactPhone: "+60 82",
    verificationStatus: "pending",
    isPublished: false,
  };

  it("fills the optional fields the form may omit", () => {
    expect(vendorFormToRpc({ ...form, contactEmail: undefined })).toMatchObject({
      slugBase: "kuching-food-walks",
      contactEmail: "",
      avatarUrl: "",
      verificationStatus: "pending",
    });
  });

  it("reads contact details out of the jsonb and tolerates junk", () => {
    const row = (contact: unknown): AdminVendorRow =>
      ({
        id: "v1", slug: "s", name: "N", description: null, location_id: null, address: null, lat: null, lng: null,
        contact, verification_status: "verified", verified_at: null, verified_by: null, avatar_url: null,
        is_sample: false, is_published: true, created_by: null, created_at: "x", updated_at: "x",
        location: { name: "Bako" },
      }) as AdminVendorRow;
    expect(adminVendorFromRow(row({ email: "e@x.test", phone: "1" }))).toMatchObject({ contactEmail: "e@x.test", contactPhone: "1", locationName: "Bako", verificationStatus: "verified" });
    for (const junk of [null, 5, "x", [], { email: 7 }]) {
      expect(adminVendorFromRow(row(junk))).toMatchObject({ contactEmail: null, contactPhone: null });
    }
  });
});
