import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import type { Attention } from "@/lib/admin-attention";
import { ATTENTION_LIST_LIMIT } from "@/lib/admin-attention";

/** Admin overview: what needs a human today — or a calm "all clear". */
export function NeedsAttention({ attention }: { attention: Attention }) {
  if (attention.total === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-4 shrink-0" />
        All clear — nothing needs your attention.
      </div>
    );
  }

  const more = (n: number) => Math.max(0, n - ATTENTION_LIST_LIMIT);

  return (
    <section
      aria-labelledby="needs-attention"
      className="overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5"
    >
      <h2
        id="needs-attention"
        className="flex items-center gap-2 border-b border-amber-500/20 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-300"
      >
        <AlertTriangle className="size-4" />
        Needs attention
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs">{attention.total}</span>
      </h2>
      <ul className="divide-y divide-amber-500/15">
        {attention.items.map((it, i) => (
          <li key={`${it.kind}-${it.href}-${i}`}>
            <Link
              href={it.href}
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-amber-500/10"
            >
              <span
                className={`size-2 shrink-0 rounded-full ${it.severity === "high" ? "bg-destructive" : "bg-amber-500"}`}
                aria-label={it.severity === "high" ? "Urgent" : "Low priority"}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{it.title}</span>
                <span className="block text-xs text-muted-foreground">{it.detail}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      {(more(attention.counts.refund) > 0 || more(attention.counts.unpaid) > 0) && (
        <Link
          href="/admin/bookings"
          className="block border-t border-amber-500/20 px-4 py-2 text-xs text-primary hover:underline"
        >
          +{more(attention.counts.refund) + more(attention.counts.unpaid)} more — see all bookings
        </Link>
      )}
    </section>
  );
}
