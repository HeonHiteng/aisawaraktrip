import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { adminListBookings, adminStats } from "@/lib/domain/admin";
import { formatDate, formatMYR } from "@/lib/format";
import { BOOKING_STATUS_META } from "@/types/booking";

export const metadata: Metadata = { title: "Admin overview" };

const STATUS_ORDER = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
] as const;

export default async function AdminOverview() {
  const [stats, bookings] = await Promise.all([
    adminStats(),
    adminListBookings(),
  ]);
  const maxStatus = Math.max(1, ...Object.values(stats.byStatus));
  const recent = bookings.slice(0, 6);

  const tiles = [
    { label: "Experiences", value: stats.experiences, sub: `${stats.publishedExperiences} live` },
    { label: "Vendors", value: stats.vendors, sub: `${stats.unverifiedVendors} to verify` },
    { label: "Attractions", value: stats.attractions },
    { label: "Bookings", value: stats.bookings, sub: `${stats.confirmedBookings} confirmed` },
    { label: "Revenue (paid)", value: formatMYR(stats.revenue) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader>
              <p className="text-2xl font-bold">{t.value}</p>
              <p className="text-xs text-muted-foreground">{t.label}</p>
              {t.sub && (
                <p className="text-[11px] text-muted-foreground">{t.sub}</p>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>

      {stats.unverifiedVendors > 0 && (
        <Link
          href="/admin/vendors"
          className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
        >
          <AlertTriangle className="size-4" />
          {stats.unverifiedVendors} vendor
          {stats.unverifiedVendors === 1 ? "" : "s"} awaiting verification
        </Link>
      )}

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Bookings by status</h2>
        <div className="mt-4 space-y-2">
          {STATUS_ORDER.map((s) => {
            const n = stats.byStatus[s] ?? 0;
            return (
              <div key={s} className="flex items-center gap-3 text-xs">
                <span className="w-20 shrink-0 capitalize text-muted-foreground">
                  {s}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-brand-gradient"
                    style={{ width: `${(n / maxStatus) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right font-medium">{n}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent bookings</h2>
          <Link
            href="/admin/bookings"
            className="text-xs text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No bookings yet.
          </p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {recent.map((b) => (
              <Link
                key={b.id}
                href={`/admin/bookings/${b.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{b.experienceTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.customerName} ·{" "}
                    {formatDate(b.bookingDate, { year: "numeric" })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs font-medium">
                    {formatMYR(b.totalAmount)}
                  </span>
                  <StatusBadge
                    label={BOOKING_STATUS_META[b.status].label}
                    tone={BOOKING_STATUS_META[b.status].tone}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
