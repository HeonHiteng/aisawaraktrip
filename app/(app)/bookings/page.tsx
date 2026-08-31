import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { BookingCard } from "@/components/booking/booking-card";
import { requireUser } from "@/lib/auth";
import { listBookings } from "@/lib/domain/bookings";
import { cn } from "@/lib/utils";

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
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No bookings yet. Find something to do in Explore.
          </p>
          <Link
            href="/explore"
            className={cn(buttonVariants(), "mt-4 bg-brand-gradient text-white")}
          >
            Explore experiences
          </Link>
        </div>
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
