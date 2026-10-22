/** A few starting points so the planner never faces a blank page (planner chips + Home quick starts). */
export const PROMPT_STARTERS = [
  "3-day food & culture trip for a couple",
  "Weekend nature escape with kids",
  "Budget solo adventure, love hiking",
  "Relaxed family week, no hiking",
];

/** Home quick starts: a short chip label for each starter; the chip opens the planner with the full prompt. */
export const QUICK_STARTS: { label: string; prompt: string }[] = [
  { label: "Food & culture", prompt: PROMPT_STARTERS[0]! },
  { label: "Nature with kids", prompt: PROMPT_STARTERS[1]! },
  { label: "Solo hiking", prompt: PROMPT_STARTERS[2]! },
  { label: "Relaxed family", prompt: PROMPT_STARTERS[3]! },
];

/** Longest `?q=` prompt the planner page accepts from a link. */
export const MAX_LINK_PROMPT = 200;
