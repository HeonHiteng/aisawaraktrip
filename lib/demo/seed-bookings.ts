import type { Booking, BookingStatus } from "@/types/booking";
import { priceBooking } from "@/types/booking";
import type { Payment } from "@/types/payment";
import type { PaymentMethod } from "@/types/payment";

/**
 * Deterministic historical bookings + payments so the admin dashboard has a
 * real shape to show on a fresh server. Injected under a synthetic user id
 * that never signs in, so it doesn't touch any persona's "My Bookings" or the
 * user list — it only feeds `allDemoBookings()` / analytics.
 */
export const SEED_USER_ID = "demo-history";

const CATALOGUE: { id: string; title: string; slug: string; price: number; vendor: string }[] = [
  { id: "exp-foodwalk", title: "Kuching Heritage & Street Food Evening Walk", slug: "kuching-heritage-street-food-walk", price: 150, vendor: "Kuching Food Walks" },
  { id: "exp-cooking", title: "Sarawak Laksa & Kolo Mee Cooking Class", slug: "sarawak-laksa-kolo-mee-cooking-class", price: 220, vendor: "Borneo à la Carte" },
  { id: "exp-cruise", title: "Santubong Sunset Wildlife River Cruise", slug: "santubong-sunset-wildlife-river-cruise", price: 180, vendor: "Santubong River Cruises" },
  { id: "exp-bako", title: "Bako National Park Full-Day Guided Trek", slug: "bako-national-park-full-day-trek", price: 320, vendor: "Adventure Alternative Borneo" },
  { id: "exp-kayak", title: "Sarawak Kiri River Kayaking at Semadang", slug: "sarawak-kiri-river-kayaking-at-semadang", price: 190, vendor: "Semadang Kayak" },
  { id: "exp-annahrais", title: "Annah Rais Longhouse & Bidayuh Culture Day", slug: "annah-rais-longhouse-bidayuh-culture-day", price: 280, vendor: "Adventure Alternative Borneo" },
];

const NAMES = [
  "Aisyah Rahman", "Tan Wei Ming", "Priya Nair", "James Ferguson", "Chloé Martin",
  "Lukas Weber", "Siti Kalsom", "David O'Brien", "Mei Ling Chong", "Arjun Patel",
  "Hannah Schmidt", "Yusuke Tanaka", "Grace Anak Joseph", "Marco Rossi", "Nurul Huda",
  "Oliver Bennett", "Chen Jing", "Fatimah Zahra", "Kevin Lim", "Sofia Lindqvist",
];

const METHODS: PaymentMethod[] = ["fpx", "fpx", "card", "ewallet", "card"];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build ~11 weeks of history ending "today". Slight upward trend + noise. */
export function buildSeedHistory(now = new Date()): {
  bookings: Booking[];
  payments: Payment[];
} {
  const rand = mulberry32(20260829);
  const bookings: Booking[] = [];
  const payments: Payment[] = [];
  const WEEKS = 11;

  for (let w = WEEKS - 1; w >= 0; w--) {
    // volume grows from ~2/wk to ~6/wk with jitter; newest week is partial
    const base = 2 + (WEEKS - 1 - w) * 0.4;
    const jitter = Math.round((rand() - 0.4) * 3);
    let count = Math.max(1, Math.round(base) + jitter);
    if (w === 0) count = Math.max(1, Math.round(count * 0.5));

    for (let i = 0; i < count; i++) {
      const exp = CATALOGUE[Math.floor(rand() * CATALOGUE.length)];
      const created = new Date(now);
      created.setDate(created.getDate() - w * 7 - Math.floor(rand() * 7));
      created.setHours(9 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);

      const numAdults = 1 + Math.floor(rand() * 4);
      const numChildren = rand() < 0.25 ? 1 + Math.floor(rand() * 2) : 0;
      const numPax = numAdults + numChildren;
      const { subtotal, serviceFee, totalAmount } = priceBooking(exp.price, numPax);

      // status skews by age: old = completed, mid = confirmed, fresh = pending
      const r = rand();
      let status: BookingStatus;
      if (w >= 5) status = r < 0.82 ? "completed" : r < 0.92 ? "cancelled" : "refunded";
      else if (w >= 2) status = r < 0.78 ? "confirmed" : r < 0.9 ? "completed" : "cancelled";
      else status = r < 0.5 ? "confirmed" : r < 0.85 ? "pending" : "cancelled";

      const bookingDate = new Date(created);
      bookingDate.setDate(bookingDate.getDate() + 7 + Math.floor(rand() * 30));

      const id = `seed-${w}-${i}-${Math.floor(rand() * 1e6).toString(36)}`;
      const name = NAMES[Math.floor(rand() * NAMES.length)];
      const method = METHODS[Math.floor(rand() * METHODS.length)];

      bookings.push({
        id,
        userId: SEED_USER_ID,
        experienceId: exp.id,
        experienceTitle: exp.title,
        experienceSlug: exp.slug,
        vendorName: exp.vendor,
        locationName: "Kuching",
        tripId: null,
        bookingDate: bookingDate.toISOString().slice(0, 10),
        startTime: "09:00",
        numAdults,
        numChildren,
        numPax,
        customerName: name,
        customerEmail: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
        customerPhone: null,
        specialRequests: null,
        unitPrice: exp.price,
        subtotal,
        serviceFee,
        totalAmount,
        currency: "MYR",
        status,
        createdAt: created.toISOString(),
      });

      // a payment exists once money has been taken (not for pending/cancelled-before-pay)
      const paid = status === "confirmed" || status === "completed";
      const refunded = status === "refunded";
      if (paid || refunded) {
        const paidAt = new Date(created);
        paidAt.setMinutes(paidAt.getMinutes() + 3 + Math.floor(rand() * 40));
        payments.push({
          id: `pay-${id}`,
          bookingId: id,
          provider: "mock",
          providerRef: `mock_${id}`,
          providerPaymentId: `mockpay_${id}`,
          amount: totalAmount,
          currency: "MYR",
          method,
          status: refunded ? "refunded" : "paid",
          createdAt: created.toISOString(),
          paidAt: paidAt.toISOString(),
        });
      }
    }
  }

  return { bookings, payments };
}
