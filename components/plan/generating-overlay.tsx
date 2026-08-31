"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const STEPS = [
  "Reading your trip…",
  "Finding experiences that match your interests…",
  "Pulling in verified local attractions…",
  "Laying out each day…",
  "Checking it against your budget…",
  "Almost there…",
];

export function GeneratingOverlay() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setI((n) => Math.min(n + 1, STEPS.length - 1)),
      1400,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-brand-hero px-6 text-center text-white">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-white/20" />
        <div className="relative grid size-16 place-items-center rounded-full bg-white/15">
          <Sparkles className="size-7" />
        </div>
      </div>
      <div>
        <p className="text-lg font-semibold">Building your Sarawak itinerary</p>
        <p className="mt-1 text-sm text-white/75">{STEPS[i]}</p>
      </div>
      <div className="flex gap-1.5">
        {STEPS.map((_, n) => (
          <span
            key={n}
            className={`h-1.5 w-6 rounded-full transition-colors ${
              n <= i ? "bg-white" : "bg-white/25"
            }`}
          />
        ))}
      </div>
      <p className="max-w-xs text-xs text-white/65">
        Only real, verified attractions and operators — nothing invented.
      </p>
    </div>
  );
}
