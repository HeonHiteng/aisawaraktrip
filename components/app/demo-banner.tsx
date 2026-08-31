import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { switchDemoPersona } from "@/app/(auth)/actions";
import type { DemoPersona } from "@/lib/demo/session";

const personas: { value: DemoPersona; label: string }[] = [
  { value: "guest", label: "Guest" },
  { value: "tourist", label: "Traveller" },
  { value: "admin", label: "Admin" },
];

export function DemoBanner({ persona }: { persona: DemoPersona }) {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
          <FlaskConical className="size-3.5" />
          Demo mode — nothing is saved
        </span>
        <span className="flex items-center gap-1">
          <span className="text-muted-foreground">View as:</span>
          {personas.map((p) => (
            <form key={p.value} action={switchDemoPersona}>
              <input type="hidden" name="persona" value={p.value} />
              <button
                type="submit"
                className={cn(
                  "rounded-full px-2 py-0.5 font-medium transition-colors",
                  p.value === persona
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            </form>
          ))}
        </span>
      </div>
    </div>
  );
}
