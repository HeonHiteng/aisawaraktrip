import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusBadge } from "@/components/common/status-badge";
import { BookingFilters } from "@/components/admin/booking-filters";
import { adminListBookings } from "@/lib/domain/admin";
import { formatDate, formatMYR } from "@/lib/format";
import { BOOKING_STATUS_META, type BookingStatus } from "@/types/booking";

export const metadata: Metadata = { title: "Admin · Bookings" };

const STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
];

export default async function AdminBookingsPage({
  searchParams,
}: PageProps<"/admin/bookings">) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as BookingStatus)
    ? (sp.status as BookingStatus)
    : null;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().toLowerCase();

  const all = await adminListBookings();

  const byStatus = STATUSES.reduce<Record<BookingStatus, number>>(
    (acc, s) => ({ ...acc, [s]: all.filter((b) => b.status === s).length }),
    {} as Record<BookingStatus, number>,
  );
  const settledRevenue = all
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((s, b) => s + b.totalAmount, 0);

  const rows = all.filter((b) => {
    if (status && b.status !== status) return false;
    if (q) {
      const hay =
        `${b.customerName} ${b.customerEmail} ${b.id} ${b.experienceTitle}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>

      {/* summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={String(all.length)} />
        <Stat label="Pending" value={String(byStatus.pending)} />
        <Stat label="Confirmed" value={String(byStatus.confirmed)} />
        <Stat label="Settled revenue" value={formatMYR(settledRevenue)} />
      </div>

      <Suspense fallback={null}>
        <BookingFilters />
      </Suspense>

      <p className="text-xs text-muted-foreground">
        {rows.length === all.length
          ? `${all.length} bookings`
          : `${rows.length} of ${all.length}`}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {all.length === 0 ? "No bookings yet." : "Nothing matches those filters."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
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
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
