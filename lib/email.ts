import "server-only";
import type { Booking } from "@/types/booking";
import { formatMYR, formatDate } from "@/lib/format";

/**
 * Transactional email. Real sending (Resend + react-email) is a Phase 7 TODO;
 * until RESEND_API_KEY is set this just logs so the flow is observable.
 */
export async function sendBookingConfirmation(booking: Booking): Promise<void> {
  const summary = `${booking.experienceTitle} · ${formatDate(
    booking.bookingDate,
    { year: "numeric" },
  )} ${booking.startTime} · ${booking.numPax} pax · ${formatMYR(
    booking.totalAmount,
  )}`;

  if (!process.env.RESEND_API_KEY) {
    console.info(
      `[email:demo] booking confirmation -> ${booking.customerEmail}\n  ${summary}\n  ref ${booking.id.toUpperCase()}`,
    );
    return;
  }

  // TODO(phase-7): Resend send with a react-email BookingConfirmation template
}
