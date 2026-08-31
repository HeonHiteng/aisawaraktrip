import type { Metadata } from "next";
import { Ticket } from "lucide-react";
import { BookingCard } from "@/components/booking/booking-card";
import { EmptyState } from "@/components/common/empty-state";
import { requireUser } from "@/lib/auth";
import { listBookings } from "@/lib/domain/bookings";

export const metadata: Metadata = { title: "My Bookings" };

export default async function BookingsPage() {
  const user = await requireUser();
  const bookings = await listBookings(user.id);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter(
    (b) => b.bookingDate >= today && b.status !== "cancelled",
  );
  const past = bookings.filter(
    (b) => b.bookingDate < today || b.status === "cancelled",
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My Bookings</h1>

      {bookings.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No bookings yet"
          description="When you book an experience, it'll show up here with your confirmation and details."
          action={{ label: "Browse experiences", href: "/explore" }}
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Upcoming
              </h2>
              {upcoming.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Past &amp; cancelled
              </h2>
              {past.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
