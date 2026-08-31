import { formatMYR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BudgetBar({
  estimated,
  budget,
  pax,
}: {
  estimated: number;
  budget: number | null;
  pax: number;
}) {
  const totalBudget = budget != null ? budget * pax : null;
  const pct =
    totalBudget && totalBudget > 0
      ? Math.min(100, Math.round((estimated / totalBudget) * 100))
      : null;
  const over = totalBudget != null && estimated > totalBudget;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Estimated cost</p>
        <p className="text-sm">
          <span className="font-semibold">~{formatMYR(estimated)}</span>
          {totalBudget != null && (
            <span className="text-muted-foreground">
              {" "}
              / {formatMYR(totalBudget)}
            </span>
          )}
        </p>
      </div>
      {pct != null && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full",
              over ? "bg-destructive" : "bg-brand-gradient",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground">
        {totalBudget == null
          ? `For ${pax} ${pax === 1 ? "traveller" : "travellers"}. Add a budget on the plan form to track it.`
          : over
            ? `About ${formatMYR(estimated - totalBudget)} over budget — try “make it cheaper”.`
            : `Within budget for ${pax} ${pax === 1 ? "traveller" : "travellers"}.`}
      </p>
    </div>
  );
}
