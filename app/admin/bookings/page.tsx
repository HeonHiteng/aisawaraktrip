import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/common/status-badge";
import { adminListBookings } from "@/lib/domain/admin";
import { formatDate, formatMYR } from "@/lib/format";
import { BOOKING_STATUS_META } from "@/types/booking";

export const metadata: Metadata = { title: "Admin · Bookings" };

export default async function AdminBookingsPage() {
  const bookings = await adminListBookings();

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">{bookings.length} total</p>
      </div>

      {bookings.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No bookings yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Experience</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  Customer
                </th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                  Date
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {b.experienceTitle}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {b.vendorName} · {b.id.toUpperCase()}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <p>{b.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.customerEmail}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {formatDate(b.bookingDate, { year: "numeric" })}
                    <br />
                    {b.startTime} · {b.numPax} pax
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatMYR(b.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={BOOKING_STATUS_META[b.status].label}
                      tone={BOOKING_STATUS_META[b.status].tone}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
