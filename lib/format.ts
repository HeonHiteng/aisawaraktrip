export function formatMYR(amount: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

const DAY_LABEL: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export function formatDays(days: string[]): string {
  if (days.length === 7) return "Daily";
  return days.map((d) => DAY_LABEL[d] ?? d).join(", ");
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    ...opts,
  });
}

export function formatDateRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const sameMonth =
    s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()}–${e.getDate()} ${e.toLocaleDateString("en-MY", { month: "short", year: "numeric" })}`;
  }
  return `${formatDate(startIso)} – ${formatDate(endIso, { year: "numeric" })}`;
}

const WEEKDAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export function weekdayKey(iso: string): string {
  return WEEKDAY[new Date(iso).getDay()];
}
