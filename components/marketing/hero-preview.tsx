import { CalendarDays, MapPin, Sparkles, Users, Wallet } from "lucide-react";

const rows = [
  { icon: MapPin, label: "Destination", value: "Kuching, Sarawak" },
  { icon: CalendarDays, label: "Travel dates", value: "20–27 Jun" },
  { icon: Wallet, label: "Budget / person", value: "MYR 1,500–2,500" },
  { icon: Users, label: "Travellers", value: "2 adults · Couple" },
];

const chips = ["Nature", "Culture", "Food", "Adventure", "Hidden gems"];

/** Decorative mock of the AI planner screen, used on the landing hero. */
export function HeroPreview() {
  return (
    <div className="w-full max-w-[280px] rounded-[1.8rem] border border-white/15 bg-white p-3 shadow-2xl shadow-black/40">
      <div className="rounded-[1.4rem] bg-brand-hero p-4 text-white">
        <p className="text-[10px] font-semibold tracking-widest text-white/70">
          PLAN YOUR TRIP WITH AI
        </p>
        <p className="mt-1 text-sm text-white/85">
          Your personal Sarawak travel assistant.
        </p>
      </div>

      <div className="space-y-1.5 py-3">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2"
          >
            <r.icon className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">{r.label}</p>
              <p className="truncate text-xs font-semibold text-foreground">
                {r.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 pb-3">
        {chips.map((c, i) => (
          <span
            key={c}
            className={
              i < 4
                ? "rounded-full bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground"
                : "rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
            }
          >
            {c}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5 rounded-full bg-brand-gradient py-2.5 text-xs font-semibold text-white">
        <Sparkles className="size-3.5" />
        Generate my trip
      </div>
    </div>
  );
}
