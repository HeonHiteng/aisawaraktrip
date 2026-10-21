---
name: ui-app-design
description: Use this skill whenever you design, build, restyle or review any screen, component or user flow in the Sarawak Trip Planner app (tourist app, marketing pages or admin), including "improve the UI/UX", "redesign this page", "make it look better", a new page or form, or a visual bug. It holds the app's design language (violet→magenta brand, dark-violet hero, pill chips, mobile-first), the shared components to reuse, the UX rules for flows and forms, and the checks to run before calling a screen done.
---

# UI app design: Sarawak Trip Planner

You are the product designer and front-end engineer for this app at once. A screen is done when it
looks like the rest of the app, works one-handed on a 375px phone, handles every state, and has been
looked at in the browser. Taste is not enough; follow the procedure.

The source of truth for tokens and component specs is **`docs/design-system.md`**. Read it before the
first UI change in a session. This skill tells you how to apply it; it does not replace it.

## Procedure (in order)

1. **Name the job of the screen.** One sentence: who is here, what single thing they came to do, and
   what they do next. Everything on the screen either serves that job or moves down / behind a tap.
2. **Find what already exists.** Before writing markup, check `components/common`, `components/ui`
   and the feature folder (`components/{plan,itinerary,explore,booking,trips,admin,…}`). Reuse; extend
   with a prop; only then create. Two components that look alike must be one component.
3. **Lay it out mobile-first.** Design at 375px, then let it breathe at `sm:` / `lg:`. App pages
   are `px-4` + `max-w-2xl`; marketing `max-w-5xl`. Primary action reachable by thumb (bottom or a
   sticky bar on long pages).
4. **Design every state**, not just the happy one: loading (skeletons, `card-grid-skeleton`), empty
   (`EmptyState`), error (inline, plain words, how to fix), pending submit (disabled + label change),
   success (toast via `sonner` or a redirect that shows the result), demo / sample data (`SampleBadge`).
5. **Write the words.** Plain, short, specific: "Generate my trip", not "Submit". Labels say what the
   value is; helper text says why it matters. No jargon, no exclamation marks in errors.
6. **Build it** with tokens and shared components (rules below). Keep it working in demo mode.
7. **Look at it.** Run the preview (see Verify) at mobile width, light and dark, and fix what you see.
   Then run the checks.

## Design language cheat sheet

- **Brand**: violet `bg-primary`; violet→magenta `bg-brand-gradient` **only** for hero CTAs, through
  `<Button variant="brand">` / `buttonVariants({ variant: "brand" })` with a leading `Sparkles` icon for
  AI actions. Dark-violet `bg-brand-hero` for the app header and page heroes, with white text. Every
  screen needs one hero moment.
- **Tokens only.** Never a hard-coded hex or `text-white` on a light surface. Use `text-muted-foreground`,
  `bg-accent`, `bg-muted`, `border-border`, `bg-card`, `text-destructive`. Dark mode comes from tokens.
- **Type**: Geist only, no serif. Page title `text-2xl font-bold tracking-tight`; hero
  `text-4xl sm:text-5xl`; eyebrow `text-xs font-semibold tracking-widest uppercase text-primary`;
  body `text-sm`–`text-base`.
- **Shape**: cards `rounded-2xl border border-border bg-card shadow-card p-4`; inner blocks
  `rounded-xl`; chips and buttons `rounded-full`; hero panels `rounded-3xl`. Interactive cards lift:
  `transition-all hover:-translate-y-0.5 hover:shadow-float`.
- **Chips** (filters, interests): unselected `border border-border text-muted-foreground`; selected
  `bg-primary text-primary-foreground` + a check icon. Use `aria-pressed` on toggle chips.
- **Status badges**: `components/common/status-badge.tsx`. Pending amber, confirmed green, cancelled /
  refunded muted, completed violet. Never color alone; the label is always there.
- **Icons**: `lucide-react`, `size-4` inline, `size-5`/`size-6` in chips. Decorative icons get `aria-hidden`.
- **Motion**: `.page-enter` is already on `app/(app)/template.tsx`. Keep motion short (≤ 300ms) and
  respect `prefers-reduced-motion`.

## Shared patterns to reuse

| Need | Use |
|---|---|
| Nothing to show yet | `components/common/empty-state.tsx` (never a bare dashed box) |
| Delete / cancel / anything destructive | `components/common/confirm-submit.tsx` (inline arm-then-confirm, no single-tap deletes) |
| Risky but not destructive (e.g. regenerate) | Two-tap confirm like `components/itinerary/regenerate-button.tsx` |
| Short scannable form (dates, people, budget…) | `EssentialRow` accordion in `components/plan/trip-form.tsx`: inputs stay mounted (CSS `hidden`) so they still post |
| Person / vendor image | `components/common/avatar.tsx` |
| Photo card | `components/explore/cover-image.tsx` + the catalogue-card spec (full-bleed photo, `from-black/60` scrim, price bottom-right) |
| Sample / demo rows | `components/common/sample-badge.tsx` (must be visible) |
| Must-see places | `components/common/must-see-badge.tsx` |
| Admin form fields | `components/admin/field.tsx`; photos via `components/admin/photo-field.tsx` |
| Long page with sections | Jump pills like `components/itinerary/day-nav.tsx` |

## UX rules for flows and forms

- **One primary action per screen.** Secondary actions are `outline` / `ghost`; never two brand buttons.
- **Ask less.** Prefill sensible defaults, infer what you can (the planner reads dates and group size from
  the free-text box), and collapse optional fields behind a "Fine-tune" style row.
- **Show the value, not the control.** Collapsed rows display the current choice ("3 days · 12–14 Nov").
- **Never lose input.** Validation errors keep what was typed and point at the field
  (`aria-invalid` + `aria-describedby`). Server Action errors come back as a message near the button.
- **Make waiting feel short.** Long AI work gets a progress overlay (`components/plan/generating-overlay.tsx`)
  with honest steps, not a frozen button.
- **Respect money and trust.** Prices show `RM` and come from the server; show what is included before
  the pay button; payments and bookings show a clear status afterwards.
- **Multi-button forms**: each submit button gets its own `<form>` + hidden input (see `AGENTS.md`).
- **Tap targets ≥ 44px** on anything a thumb hits (`min-h-11` or padding); no hover-only affordances.

## Accessibility (non-negotiable)

- Every input has a real `<label>` (or `aria-label` when visually hidden); icon-only buttons have `aria-label`.
- Text contrast ≥ 4.5:1 in light **and** dark; muted text on `bg-muted` is the usual failure.
- Headings go in order (one `h1` per page); landmarks via the existing layouts.
- Focus is visible (the button/input focus rings already exist; don't remove `outline`).
- `tests/e2e/a11y.spec.ts` runs axe on the main pages. Add new pages to it.

## Verify before saying done

1. Start the demo preview (`preview_start` with the dev server from `.claude/launch.json`) and open the
   page. Check at `resize_window` preset `mobile`, then `desktop`; check `colorScheme: "dark"`.
2. Read the page (`read_page` / `get_page_text`) and the console for errors; screenshot for proof.
3. Run, in order: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` (includes the axe
   pass). Stop any stray dev server on :3000 first or the e2e run collides with it.
4. If the change touches a documented pattern, update `docs/design-system.md` in the same commit.

## Don't

- No serif, no teal/green primary, no hard-coded colors, no gradient on body surfaces or plain buttons.
- No screen without a dark-violet header or hero moment.
- No new one-off component when a shared one fits; no copy-pasted card variants.
- No unmounting of form inputs inside collapsible UI that a Server Action reads.
- Don't break demo mode: every screen still renders from `lib/demo` fixtures.
