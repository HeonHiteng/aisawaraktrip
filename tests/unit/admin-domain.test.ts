import { describe, expect, it } from "vitest";
import {
  adminDeleteAttraction,
  adminDeleteExperience,
  adminDeleteVendor,
  adminGetAttraction,
  adminGetExperience,
  adminGetVendor,
  adminListAttractions,
  adminListExperiences,
  adminListVendors,
  adminSaveAttraction,
  adminSaveExperience,
  adminSaveVendor,
  adminSetAttractionPublished,
  adminSetBookingStatus,
  adminSetExperiencePublished,
  adminSetVendorVerification,
} from "@/lib/domain/admin";
import { createBooking } from "@/lib/domain/bookings";
import type { ExperienceForm, VendorForm, AttractionForm } from "@/lib/validation/admin";

let seq = 0;
const uniq = () => `${Date.now()}-${seq++}`;

function vendorInput(overrides: Partial<VendorForm> = {}): VendorForm {
  return {
    name: `Test Vendor ${uniq()}`,
    description: "",
    locationName: "",
    contactEmail: "",
    contactPhone: "",
    verificationStatus: "unverified",
    isPublished: true,
    ...overrides,
  };
}

function experienceInput(
  vendorId: string,
  overrides: Partial<ExperienceForm> = {},
): ExperienceForm {
  return {
    title: `Test Experience ${uniq()}`,
    summary: "",
    description: "",
    vendorId,
    locationId: "loc-city",
    durationMinutes: 120,
    pricePerPerson: 100,
    minPax: 1,
    maxPax: 10,
    categories: ["food"],
    meetingPoint: "",
    availabilityDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    availabilityTimes: "09:00, 14:00",
    capacityPerSlot: 10,
    bookingLeadtimeHours: 24,
    isPublished: true,
    ...overrides,
  };
}

function attractionInput(overrides: Partial<AttractionForm> = {}): AttractionForm {
  return {
    name: `Test Attraction ${uniq()}`,
    summary: "",
    description: "",
    locationId: "loc-city",
    address: "",
    avgVisitMinutes: 60,
    priceMin: 0,
    priceMax: 0,
    isFree: true,
    categories: ["heritage"],
    tips: "",
    isPublished: true,
    ...overrides,
  };
}

describe("admin experiences", () => {
  it("creates, edits, publishes and deletes an experience", async () => {
    const vendor = await adminSaveVendor(vendorInput());
    const created = await adminSaveExperience(experienceInput(vendor.id));

    expect(created.vendor.id).toBe(vendor.id);
    expect(await adminGetExperience(created.id)).toMatchObject({ id: created.id });
    expect((await adminListExperiences()).some((e) => e.id === created.id)).toBe(true);

    const edited = await adminSaveExperience(
      experienceInput(vendor.id, { id: created.id, pricePerPerson: 250 }),
    );
    expect(edited.id).toBe(created.id);
    expect(edited.pricePerPerson).toBe(250);
    // editing preserves fields the form doesn't own
    expect(edited.slug).toBe(created.slug);

    await adminSetExperiencePublished(created.id, false);
    expect((await adminGetExperience(created.id))?.isPublished).toBe(false);

    await adminDeleteExperience(created.id);
    expect(await adminGetExperience(created.id)).toBeNull();
  });

  it("parses comma-separated availability times into an array", async () => {
    const vendor = await adminSaveVendor(vendorInput());
    const exp = await adminSaveExperience(
      experienceInput(vendor.id, { availabilityTimes: "09:00,  14:30 ,18:00" }),
    );
    expect(exp.availability.times).toEqual(["09:00", "14:30", "18:00"]);
  });

  it("falls back to an 'unknown vendor' placeholder for a bad vendor id", async () => {
    const exp = await adminSaveExperience(experienceInput("nonexistent-vendor-id"));
    expect(exp.vendor.name).toBe("Unknown vendor");
  });
});

describe("admin vendors", () => {
  it("creates, verifies, and propagates the change to its experiences", async () => {
    const vendor = await adminSaveVendor(vendorInput({ verificationStatus: "pending" }));
    const exp = await adminSaveExperience(experienceInput(vendor.id));
    expect(exp.vendor.verificationStatus).toBe("pending");

    await adminSetVendorVerification(vendor.id, "verified");
    expect((await adminGetVendor(vendor.id))?.verificationStatus).toBe("verified");
    // the experience's denormalized vendor ref is kept in sync
    expect((await adminGetExperience(exp.id))?.vendor.verificationStatus).toBe(
      "verified",
    );

    await adminDeleteVendor(vendor.id);
    expect(await adminGetVendor(vendor.id)).toBeNull();
    expect((await adminListVendors()).some((v) => v.id === vendor.id)).toBe(false);
  });
});

describe("admin attractions", () => {
  it("creates, edits, publishes and deletes an attraction", async () => {
    const created = await adminSaveAttraction(attractionInput());
    expect(await adminGetAttraction(created.id)).toMatchObject({ id: created.id });

    const edited = await adminSaveAttraction(
      attractionInput({ id: created.id, isFree: false, priceMin: 20, priceMax: 30 }),
    );
    expect(edited.isFree).toBe(false);
    expect(edited.priceMin).toBe(20);

    await adminSetAttractionPublished(created.id, false);
    expect((await adminGetAttraction(created.id))?.isPublished).toBe(false);

    await adminDeleteAttraction(created.id);
    expect(await adminGetAttraction(created.id)).toBeNull();
    expect((await adminListAttractions()).some((a) => a.id === created.id)).toBe(false);
  });

  it("zeroes out price when isFree is set", async () => {
    const att = await adminSaveAttraction(attractionInput({ isFree: true, priceMin: 50, priceMax: 80 }));
    expect(att.priceMin).toBe(0);
    expect(att.priceMax).toBe(0);
  });
});

describe("admin bookings", () => {
  it("can change a booking's status regardless of the tourist-side transition rules", async () => {
    const userId = `admin-domain-user-${uniq()}`;
    const booking = await createBooking(userId, {
      experienceId: "exp-cruise",
      tripId: null,
      bookingDate: "2026-12-15",
      startTime: "15:30",
      numAdults: 2,
      numChildren: 0,
      customerName: "Test",
      customerEmail: "test@example.com",
      customerPhone: null,
      specialRequests: null,
    });
    if ("error" in booking) throw new Error(booking.error);

    // admin can jump straight from pending to completed, which a tourist can't
    await adminSetBookingStatus(booking.id, "completed");
    const updated = await import("@/lib/domain/bookings").then((m) =>
      m.getBooking(userId, booking.id),
    );
    expect(updated?.status).toBe("completed");
  });
});
