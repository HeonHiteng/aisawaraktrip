"use client";

import { useId, useState } from "react";
import { formatMYR } from "@/lib/format";

/* ------------------------------------------------------------------ *
 * Shared chart chrome                                                 *
 * ------------------------------------------------------------------ */

const VB_W = 720;
const VB_H = 260;
const M = { top: 16, right: 16, bottom: 30, left: 46 };
const PLOT_W = VB_W - M.left - M.right;
const PLOT_H = VB_H - M.top - M.bottom;

function niceMax(v: number, steps = 4) {
  if (v <= 0) return steps;
  const raw = v / steps;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  return step * steps;
}

function roundedTopRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${
    x + w - rr
  },${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

type Tip = { x: number; y: number; rows: { label: string; value: string }[] } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-float"
      style={{ left: `${tip.x}%`, top: `${tip.y}%` }}
    >
      {tip.rows.map((r, i) => (
        <div key={i} className="whitespace-nowrap">
          {r.value && (
            <span className="font-semibold text-foreground">{r.value} </span>
          )}
          <span className="text-muted-foreground">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Weekly bookings — columns                                           *
 * ------------------------------------------------------------------ */

export function WeeklyBookingsChart({
  data,
}: {
  data: { label: string; bookings: number; weekStart: string }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...data.map((d) => d.bookings)));
  const band = PLOT_W / data.length;
  const colW = Math.min(24, band * 0.54);
  const x = (i: number) => M.left + i * band + (band - colW) / 2;
  const y = (v: number) => M.top + PLOT_H - (v / max) * PLOT_H;
  const ticks = [0, max / 2, max];

  const tip: Tip =
    hover == null
      ? null
      : {
          x: ((x(hover) + colW / 2) / VB_W) * 100,
          y: (y(data[hover].bookings) / VB_H) * 100,
          rows: [
            { label: "bookings", value: String(data[hover].bookings) },
            { label: `week of ${data[hover].label}`, value: "" },
          ],
        };

  return (
    <ChartCard title="Bookings per week" hint="last 10 weeks">
      <div className="relative">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full"
          role="img"
          aria-label="Column chart of bookings created per week over the last 10 weeks"
        >
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={M.left}
                x2={VB_W - M.right}
                y1={y(t)}
                y2={y(t)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={M.left - 8}
                y={y(t) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {t}
              </text>
            </g>
          ))}

          {data.map((d, i) => (
            <path
              key={i}
              d={roundedTopRect(
                x(i),
                y(d.bookings),
                colW,
                M.top + PLOT_H - y(d.bookings),
                4,
              )}
              className={
                hover === i ? "fill-primary" : "fill-primary/85"
              }
            />
          ))}

          {data.map((d, i) => (
            <g key={i}>
              <text
                x={x(i) + colW / 2}
                y={VB_H - 10}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {i % 2 === 0 ? d.label : ""}
              </text>
              <rect
                x={M.left + i * band}
                y={M.top}
                width={band}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          ))}
        </svg>
        <Tooltip tip={tip} />
      </div>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ *
 * Weekly revenue — area + line                                        *
 * ------------------------------------------------------------------ */

export function WeeklyRevenueChart({
  data,
}: {
  data: { label: string; revenue: number; weekStart: string }[];
}) {
  const gradId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...data.map((d) => d.revenue)));
  const step = data.length > 1 ? PLOT_W / (data.length - 1) : 0;
  const x = (i: number) => M.left + i * step;
  const y = (v: number) => M.top + PLOT_H - (v / max) * PLOT_H;
  const ticks = [0, max / 2, max];

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.revenue)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${M.top + PLOT_H} L${x(0)},${
    M.top + PLOT_H
  } Z`;

  const tip: Tip =
    hover == null
      ? null
      : {
          x: (x(hover) / VB_W) * 100,
          y: (y(data[hover].revenue) / VB_H) * 100,
          rows: [
            { label: "paid", value: formatMYR(data[hover].revenue) },
            { label: `week of ${data[hover].label}`, value: "" },
          ],
        };

  return (
    <ChartCard title="Revenue per week" hint="settled payments">
      <div className="relative">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full"
          role="img"
          aria-label="Area chart of settled revenue per week over the last 10 weeks"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={M.left}
                x2={VB_W - M.right}
                y1={y(t)}
                y2={y(t)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={M.left - 8}
                y={y(t) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {t >= 1000 ? `${Math.round(t / 1000)}k` : t}
              </text>
            </g>
          ))}

          <path d={area} fill={`url(#${gradId})`} />
          <path
            d={line}
            fill="none"
            stroke="var(--chart-2)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {hover != null && (
            <>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={M.top}
                y2={M.top + PLOT_H}
                className="stroke-muted-foreground/40"
                strokeWidth={1}
              />
              <circle
                cx={x(hover)}
                cy={y(data[hover].revenue)}
                r={4}
                fill="var(--chart-2)"
                stroke="var(--card)"
                strokeWidth={2}
              />
            </>
          )}

          {data.map((d, i) => (
            <g key={i}>
              <text
                x={x(i)}
                y={VB_H - 10}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {i % 2 === 0 ? d.label : ""}
              </text>
              <rect
                x={x(i) - step / 2}
                y={M.top}
                width={step || PLOT_W}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          ))}
        </svg>
        <Tooltip tip={tip} />
      </div>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ *
 * Horizontal bars — status / top experiences                          *
 * ------------------------------------------------------------------ */

export function HBars({
  title,
  hint,
  items,
}: {
  title: string;
  hint?: string;
  /** `value` drives the bar length; `display` is the printed figure. */
  items: { label: string; value: number; display?: string; color?: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ChartCard title={title} hint={hint}>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it.label} className="grid grid-cols-[9rem_1fr_auto] items-center gap-3">
            <span className="truncate text-xs text-muted-foreground" title={it.label}>
              {it.label}
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(2, (it.value / max) * 100)}%`,
                  background: it.color ?? "var(--primary)",
                }}
              />
            </span>
            <span className="text-right text-xs font-semibold tabular-nums">
              {it.display ?? it.value}
            </span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
