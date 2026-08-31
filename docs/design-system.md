# Design system

Source of truth for the app's look. Derived from the product proposal
(`People Growth Solutions — AI-Powered Trip Planning for Sarawak`, 2026).
Every screen from Phase 3 onward should follow this.

## Feel

Premium, modern, mobile-first travel app with an **AI-assistant** personality.
Violet → magenta brand, dark-violet hero surfaces, lots of rounding, big friendly
sans type, generous whitespace, strong photography. Not a generic admin template.

## Color (tokens in `app/globals.css`)

| Token | Role |
|---|---|
| `--primary` / `bg-primary` | Violet. Primary buttons, active states, links, icons. |
| `bg-brand-gradient` | Violet→magenta gradient. **Hero CTAs only** ("Generate my trip", "Start planning"). Pair with white text. |
| `bg-brand-hero` | Dark-violet gradient. Landing hero, app header, page hero headers. White text on top. |
| `--accent` / `bg-accent` | Pale violet tint. Icon chips, active nav pill, hover. |
| `--muted` | Near-white grey. Form-row backgrounds, secondary surfaces. |
| `--destructive` | Errors only. |
| `--chart-1..5` | Violet, cyan, green, amber, pink — analytics. |

Dark mode is fully defined; don't hard-code hex — use tokens.

## Type

- One family: **Geist** (`--font-sans`), also used for headings (`--font-heading`).
  No serif anywhere.
- Headings: `font-bold tracking-tight`. Page title `text-2xl`, hero `text-4xl sm:text-5xl`.
- Body: `text-sm`–`text-base`. Secondary text: `text-muted-foreground`.
- Eyebrow labels (deck style): `text-xs font-semibold tracking-widest uppercase text-primary`.

## Shape & spacing

- `--radius: 0.85rem`. Cards `rounded-2xl`, inner blocks `rounded-xl`,
  chips/buttons pill (`rounded-full`), hero panels `rounded-3xl`.
- Card: `rounded-2xl border border-border bg-card shadow-card` + `p-4`.
- **Elevation** (violet-tinted, in globals.css): `shadow-card` (resting cards),
  `shadow-float` (hover / raised). Interactive cards:
  `transition-all hover:-translate-y-0.5 hover:shadow-float`.
- **Motion**: `.page-enter` (on `app/(app)/template.tsx`) fades content up on every
  navigation; respects `prefers-reduced-motion`. Card hover lift + image
  `group-hover:scale-105`.
- Page gutters: `px-4`, content `max-w-2xl` (app) / `max-w-5xl` (marketing).

## Key component patterns (v2)

- **Catalogue card**: full-bleed photo (`h-44`) with a bottom `from-black/60`
  scrim; badges are translucent pills on the image (`bg-black/45 backdrop-blur`);
  price is overlaid bottom-right in bold white; body = title (2-line clamp) +
  vendor row (`Avatar` + name) + meta line. No redundant "View" button — the
  whole card is the link.
- **Itinerary**: a real vertical timeline — a `w-px` spine at `left-[4.75rem]`,
  each item a `size-8` dot (`ring-4 ring-card`) on the spine, time in the gutter,
  the "Why" line in a `bg-primary/5` callout.
- **Detail page**: title → "at a glance" 2×4 stat grid (`Glance` chips) → vendor
  card → sectioned body (`## About`, `## What's included`, `## Good to know`) →
  sticky price+CTA bar with `shadow-[0_-8px_20px_...]`.
- **`Avatar`** (`components/common/avatar.tsx`): image when a usable src, else
  initials on `bg-accent`.

## Components

### Bottom nav (`components/app/app-nav.tsx`)
Fixed, light bar, 5 tabs: **Plan · Explore · Trips · Bookings · Profile**.
Icon in a pill; active tab = `text-primary` + `bg-accent` pill.
(Proposal also shows Messages/Favorites — out of MVP scope, defer.)

### App header (`components/app/app-header.tsx`)
`bg-brand-hero`, white text, wordmark left, sign-out right.

### Interest / filter chips
Pill. Unselected: `border border-border text-muted-foreground`.
Selected: `bg-primary text-primary-foreground` + a check icon.

### Primary CTA
Full-width, pill, `bg-brand-gradient text-white`, leading `Sparkles` icon for AI actions.
Normal actions use the default `<Button>` (solid violet).

### Form rows (planner inputs)
Inside a white card: `flex items-center gap-3 rounded-xl bg-muted px-3 py-2` —
`icon (text-primary)` + stacked `label (text-[10px] text-muted-foreground)` /
`value (text-xs font-semibold)` + trailing chevron.

### Experience card (Phase 3)
Cover image (16:10) → then padding. Overlays on image: `Verified` badge top-left
(`bg-brand-gradient` or `bg-primary` pill), heart top-right.
Body: vendor avatar + name + `MapPin` location, rating (`Star` + `4.9` + `(128)` muted),
2-line description, tag chips (`Direct booking`, `Available tomorrow` — use a green dot
for availability), then a row: `From **MYR 220** /night` left, `Book now` violet pill right.

### Badges
Small pills: `AI Personalized`, `Verified`, `Sample data`, booking status.
Status colors: pending=amber, confirmed=green, cancelled=muted, completed=violet, refunded=muted.

### Itinerary day row (Phase 5)
Thumbnail (rounded) + `Day N` bold + subtitle + right-side location + expand chevron.

## Imagery

Demo photos are remote (Unsplash) for now — configure `next.config.ts`
`images.remotePatterns` in Phase 3. Real owned assets go to Supabase Storage
(`catalogue` bucket). Sample rows always show a visible `Sample data` badge.

## Don't

- No serif. No teal/green as the primary (that was a scrapped earlier pick).
- Don't put the brand gradient on large body surfaces or plain buttons — CTAs and hero only.
- Don't ship screens without a dark-violet header or hero moment; that's the brand signature.
