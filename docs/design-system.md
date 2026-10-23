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
- **Rail** (`components/common/rail.tsx`): a titled, horizontally snap-scrolling row of
  cards (`RailItem`, `w-[17rem]`, narrower for compact cards). Bleeds to the screen edge so
  the next card peeks in; no visible scrollbar; optional one-line description + "See all".
  Use it on overview screens (Home) instead of stacking full-width cards; Explore keeps the grid.
- **Home** (`app/(app)/home/page.tsx`): greeting → `rounded-3xl bg-brand-hero` planner hero
  (a search-style pill into `/plan` + quick-start chips that open `/plan?q=…` pre-filled) →
  continue / next-booking rows → "Must-see" rail (compact `AttractionCard`) → "Popular
  experiences" rail → food-guide row → 4-column interest tiles (`CATEGORY_ICON`).

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
`<Button variant="brand">` (or `buttonVariants({ variant: "brand" })` for links) —
violet→magenta gradient, white text. Full-width + `size="lg"` for page-level CTAs,
leading `Sparkles` icon for AI actions. Never hand-roll `bg-brand-gradient text-white`
on a button — use the variant so hover/focus stay consistent.
Normal actions use the default `<Button>` (solid violet).

### Empty states
One component: `components/common/empty-state.tsx` — soft `bg-accent` icon chip,
short title, one line of guidance, optional brand action button. Use it everywhere;
never a bare `border-dashed` box.

### Destructive actions
`components/common/confirm-submit.tsx` — a ghost trigger that arms an inline
confirm row (prompt + `destructive` submit + "Keep it"). No single-tap deletes.

### Form rows (planner inputs)
Built in `components/plan/trip-form.tsx` (`EssentialRow`). Each row: `flex items-center
gap-3 rounded-xl border px-3 py-2.5` — icon in a `bg-accent text-primary` chip + stacked
`label (text-[10px] text-muted-foreground)` / `value (text-xs font-semibold)` + a trailing
chevron that rotates 180° when open. Tapping the row expands its real controls in place
(CSS `hidden`, never unmounted, so a collapsed row's inputs still post with the form); only
one row open at a time. A non-interactive row (no chevron) uses the same look for fixed,
informational values. This is how the AI planner's "trip essentials" (dates, travellers,
budget, fine-tune) stay a short, scannable stack instead of one long always-open form.

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

**Every card shows a photo, and an item's own photo is always really of it.** Every catalogue
place and experience has a real photo of it in `/public/photos` (Wikimedia Commons, freely licensed),
and every food-guide card shows its signature dish from `/public/photos/dishes`
(`eateryPhoto` in `lib/photo-credits.ts`). Each one is credited in
`data/photo-credits.json`: a "Photo: author · licence" line under detail heroes
(`PhotoCredit`) and the full list on `/credits`. New bundled photos need a credit entry
(`tests/unit/photo-credits.test.ts` enforces it). Owned photos uploaded by an admin go to
Supabase Storage (`catalogue` bucket) and need no credit.

An item's own photo is used unless it is a remote Unsplash link (`isRealPhoto`). The old
`/public/demo` files DO show as an item's own photo (founder's choice, Oct 2026), although several
show other places — replace them with `/photos` or an admin upload for a true photo. Otherwise `coverPhoto`
(`lib/photo-credits.ts`) gives a **stand-in** for its category (`CATEGORY_PHOTO`: generic mood
shots from `/public/demo` such as a forest trail or a plated dish, never a photo of a different
real landmark; empty alt text), else the riverfront (`DEFAULT_PHOTO`). Cards that point at
catalogue items borrow their photo (`lib/card-photos.ts`): a trip shows its first place (card,
and its page header tinted with `bg-brand-hero` behind the title), a booking its experience, an
itinerary stop its place / experience / eatery as a 56px thumbnail the text wraps around. Pass
`sizes` with the rendered width. Sample rows always show a visible `Sample data` badge.

### Sign in / register (`app/(auth)/layout.tsx`, `components/auth/auth-form.tsx`)
A Kuching photo header (brand, tagline, photo credit) with the form on a `rounded-t-3xl` sheet
that overlaps it on phones; photo left / form right from `lg`. Fields `h-11 rounded-xl`,
full-width pill buttons, a show/hide toggle on the password, "Continue as guest" as the
secondary path.

### Profile (`app/(app)/profile/page.tsx`)
A `bg-brand-hero rounded-3xl` identity card (avatar, name, email, role pill, three tappable stat
tiles) → details form (or "Save your account" for guests) → settings-style `LinkList` groups
(icon chip, label, chevron) → Account (sign out, delete).

## Don't

- No serif. No teal/green as the primary (that was a scrapped earlier pick).
- Don't put the brand gradient on large body surfaces or plain buttons — CTAs and hero only.
- Don't ship screens without a dark-violet header or hero moment; that's the brand signature.
