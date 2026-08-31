export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "refunded";

export interface BookingInput {
  experienceId: string;
  tripId: string | null;
  bookingDate: string; // yyyy-mm-dd
  startTime: string; // "09:00"
  numAdults: number;
  numChildren: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  specialRequests: string | null;
}

export interface Booking extends BookingInput {
  id: string;
  userId: string;
  experienceTitle: string;
  experienceSlug: string;
  vendorName: string;
  locationName: string | null;
  unitPrice: number;
  numPax: number;
  subtotal: number;
  serviceFee: number;
  totalAmount: number;
  currency: string;
  status: BookingStatus;
  createdAt: string;
}

export const SERVICE_FEE_RATE = 0.06;

export function priceBooking(unitPrice: number, numPax: number) {
  const subtotal = unitPrice * numPax;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE * 100) / 100;
  return { subtotal, serviceFee, totalAmount: subtotal + serviceFee };
}

export const BOOKING_STATUS_META: Record<
  BookingStatus,
  { label: string; tone: "amber" | "green" | "muted" | "violet" }
> = {
  pending: { label: "Awaiting payment", tone: "amber" },
  confirmed: { label: "Confirmed", tone: "green" },
  completed: { label: "Completed", tone: "violet" },
  cancelled: { label: "Cancelled", tone: "muted" },
  refunded: { label: "Refunded", tone: "muted" },
};
