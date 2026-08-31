import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import {
  HBars,
  WeeklyBookingsChart,
  WeeklyRevenueChart,
} from "@/components/admin/analytics-charts";
import { adminAnalytics, adminListBookings } from "@/lib/domain/admin";
import { formatDate, formatMYR } from "@/lib/format";
import { BOOKING_STATUS_META, type BookingStatus } from "@/types/booking";

export const metadata: Metadata = { title: "Admin overview" };

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: "var(--chart-4)",
  confirmed: "var(--chart-3)",
  completed: "var(--chart-1)",
  cancelled: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
  refunded: "color-mix(in oklch, var(--muted-foreground) 70%, transparent)",
};

function pctDelta(cur: number, prev: number): number | null {
  if (prev <= 0) return cur > 0 ? 1 : null;
  return (cur - prev) / prev;
}

function StatTile({
  label,
  value,
  delta,
  sub,
}: {
  label: string;
  value: string;
  delta?: number | null;
  sub?: string;
}) {
  const up = delta != null && delta >= 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {delta != null ? (
        <p
          className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium ${
            up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
          }`}
        >
          {up ? (
            <ArrowUpRight className="size-3.5" />
          ) : (
            <ArrowDownRight className="size-3.5" />
          )}
          {Math.abs(delta * 100).toFixed(0)}% vs prev 4 weeks
        </p>
      ) : (
        sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

export default async function AdminOverview() {
  const [a, bookings] = await Promise.all([
    adminAnalytics(),
    adminListBookings(),
  ]);
  const recent = bookings.slice(0, 6);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Revenue (paid, 4 weeks)"
          value={formatMYR(a.kpis.revenue4w)}
          delta={pctDelta(a.kpis.revenue4w, a.kpis.revenuePrev4w)}
        />
        <StatTile
          label="Bookings (4 weeks)"
          value={String(a.kpis.bookings4w)}
          delta={pctDelta(a.kpis.bookings4w, a.kpis.bookingsPrev4w)}
        />
        <StatTile
          label="Confirmed rate"
          value={`${(a.kpis.confirmedRate * 100).toFixed(0)}%`}
          sub={`${a.kpis.bookings} bookings all-time`}
        />
        <StatTile
          label="Avg booking value"
          value={formatMYR(Math.round(a.kpis.avgBookingValue))}
          sub={`${formatMYR(a.kpis.revenue)} paid all-time`}
        />
      </div>

      {a.catalogue.unverifiedVendors > 0 && (
        <Link
          href="/admin/vendors"
          className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
        >
          <AlertTriangle className="size-4" />
          {a.catalogue.unverifiedVendors} vendor
          {a.catalogue.unverifiedVendors === 1 ? "" : "s"} awaiting verification
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyBookingsChart data={a.weekly} />
        <WeeklyRevenueChart data={a.weekly} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HBars
          title="Bookings by status"
          hint="all-time"
          items={a.byStatus.map((s) => ({
            label: s.label,
            value: s.count,
            color: STATUS_COLOR[s.status],
          }))}
        />
        <HBars
          title="Top experiences"
          hint="by paid revenue"
          items={a.topExperiences.map((e) => ({
            label: e.title,
            value: e.revenue,
            display: formatMYR(e.revenue),
          }))}
        />
      </div>

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
