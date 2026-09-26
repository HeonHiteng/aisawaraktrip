# Build checklist

Legend: ✅ done · 🔨 in progress · ⏭️ next · 🚫 blocked

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | Project setup & architecture | ✅ |
| 2 | Database & authentication | ✅ live on Supabase (guest login verified; register/email-confirm needs the dashboard URL config) |
| 3 | Explore (attractions / vendors / experiences) | ✅ live on Supabase (Mapbox pins still pending a token) |
| 4 | AI Trip Planner | ✅ Claude integration built & tested with a fake client (dormant until `ANTHROPIC_API_KEY`; live check: `npm run test:live`) |
| 5 | Itinerary management | ✅ live on Supabase |
| 6 | Booking system | ✅ live on Supabase (slot capacity enforced, 30-min holds) |
| 7 | Payment integration | ✅ Stripe built & tested (dormant until keys; Billplz not started); mock still the default |
| 8 | Admin dashboard | ✅ live on Supabase (admin's own session + RLS; needs-attention panel, photo upload) |
| 9 | Testing & security | 🔨 (tests, nonce CSP, rate limiting, a11y scan done; Sentry optional) |
| 10 | Deployment | ✅ staging live: https://sarawak-trip-planner.vercel.app (auto-deploys from `main`) |

## Phase 1 — setup

- ✅ Next.js 16 + TS + Tailwind v4 scaffold
- ✅ shadcn/ui init + base components (button, card, input, label, badge, sonner, separator)
- ✅ Folder skeleton (`app/(marketing|auth|app)`, `app/admin`, `app/api`, `lib/*`, `supabase/*`, `tests/*`)
- ✅ Brand palette (rainforest jade) in `app/globals.css`
- ✅ Root layout: metadata, viewport, PWA manifest link, Toaster
- ✅ PWA `app/manifest.ts` + generated `app/icon.tsx`
- ✅ Landing page `app/(marketing)/page.tsx` + header/footer
- ✅ `GET /api/health`
- ✅ `.env.local.example` (all phases documented)
- ✅ Verified: `npm run typecheck`, `npm run lint`, `npm run build`, dev server (`/`, `/api/health`, `/manifest.webmanifest`, `/icon`) all green
- ⏭️ User: create Vercel project + first deploy (blank shell)
- ⏭️ User: `git commit` the scaffold

## Phase 2 — database & auth

- ✅ `@supabase/ssr` + `@supabase/supabase-js` + `supabase` CLI + `zod` + `server-only`
- ✅ `supabase init` → `supabase/config.toml`
- ✅ Migrations `20260829090001..06` — full schema (16 tables), enums, triggers, RLS, storage buckets
- ✅ `supabase/seed.sql` — Kuching demo data (7 cats, 5 locations, 8 attractions, 5 vendors, 6 experiences, images) all `is_sample`
- ✅ 3 Supabase clients (`lib/supabase/{client,server,admin}.ts`) + `config.ts` guard
- ✅ `proxy.ts` (Next 16 middleware) — session refresh, no-ops until configured
- ✅ `lib/auth.ts` — `getUser` / `getProfile` / `requireUser` / `requireAdmin`
- ✅ `lib/validation/auth.ts` — Zod schemas
- ✅ Auth: `/login`, `/register`, `/auth/callback`, sign-out — Server Actions + `useActionState`
- ✅ Guest login — `signInAnonymously` ("Continue as guest"), guest banner in app shell, "Save your trips" upgrade form on `/profile` (`updateUser` keeps the same user id)
- ✅ Authed shell `app/(app)/layout.tsx` + mobile bottom nav + header; placeholder pages (plan/explore/trips/bookings)
- ✅ `/profile` — view + edit (server action, RLS-gated)
- ✅ `/admin` — `requireAdmin` guard + stub dashboard (live counts)
- ✅ `types/database.ts` placeholder (loose, valid) → replace via `npm run gen:types`
- ✅ Verified: typecheck / lint / build / dev smoke (`/plan` → 307 `/login`, forms render)
- 🚫 User: create Supabase project, put keys in `.env.local`
- 🚫 User: `supabase link` → `npm run db:push` → run `seed.sql` → `npm run gen:types`
- 🚫 User: register + sign in, promote self to admin, test `/profile` + `/admin`
- 🚫 User: Supabase dashboard → Auth → Providers → enable **Anonymous sign-ins** (for guest login)

## UI design (from client proposal)

- ✅ Re-themed to the proposal's **violet → magenta** brand (was jade green)
- ✅ `app/globals.css` tokens: `--primary` violet, `bg-brand-gradient`, `bg-brand-hero`, vibrant charts, Geist sans for headings (killed the base-nova serif)
- ✅ Landing: dark-violet hero + planner preview card + gradient CTA band
- ✅ App header = `bg-brand-hero`; bottom nav active = accent pill; violet logos/icons
- ✅ `docs/design-system.md` + `docs/reference/` (proposal screens) — **follow this every phase**
- ✅ Verified: typecheck / lint / build green; landing + login screenshot on-brand

## Demo mode (build/preview without Supabase)

- ✅ `NEXT_PUBLIC_DEMO_MODE` (auto-ON when Supabase unconfigured) — `lib/demo/mode.ts`
- ✅ Fake session via cookie, 3 personas — `lib/demo/session.ts`; persona switcher in the in-app banner
- ✅ Fixture catalogue mirroring `seed.sql` — `lib/demo/fixtures.ts` (8 attractions, 5 vendors, 6 experiences)
- ✅ `lib/domain/catalogue.ts` — demo-or-Supabase data layer (screens don't care which)
- ✅ Auth actions + `lib/auth.ts` branch on demo mode; `/admin` counts too
- ✅ Whole app clickable: guest/login/register → app, persona switch, Explore, detail pages, Profile, Admin

## Phase 3 — Explore (demo)

- ✅ `types/catalogue.ts` domain types
- ✅ `/explore` — search + Experiences/Attractions toggle + category chips (URL-synced) + card grid
- ✅ `ExperienceCard` / `AttractionCard` per `docs/design-system.md`
- ✅ `/explore/experiences/[slug]` — cover, vendor, includes, availability, sticky book bar
- ✅ `/explore/attractions/[slug]` — cover, hours, address, tips
- ✅ `CoverImage` — branded category gradient (no image deps); swaps to real photos when Supabase URLs exist
- ✅ `/book/[experienceId]` placeholder (Phase 6)
- ✅ `next.config.ts` image `remotePatterns` (Unsplash + Supabase host)
- ⏭️ Phase 3 real: wire `lib/domain/catalogue.ts` Supabase branch, map rows → domain types, real photos in Storage
- ⏭️ Mapbox pin on detail pages

## Phase 4 — AI Trip Planner (demo)

- ✅ `types/trip.ts` domain types + helpers
- ✅ `lib/validation/trip.ts` (Zod, date range, 14-day cap)
- ✅ `lib/ai/itinerary.ts` — deterministic builder that assembles days ONLY from
  catalogue records; `lib/ai/generate.ts` entry (Claude call = `TODO(phase-4)`)
- ✅ `/plan` — trip form matching the proposal mockup (dark hero, form rows, interest/pace pills, gradient CTA)
- ✅ `generateTrip` action → build itinerary → store → `/trips/[id]`

## Phase 5 — Itinerary management (demo)

- ✅ `lib/demo/store.ts` (in-memory per persona, seeded sample trip) + `lib/domain/trips.ts`
- ✅ `/trips` list · `/trips/[tripId]` day-by-day itinerary
- ✅ `RefineBox` — natural-language + preset refinements → `applyRefinement` rule engine
  ("cheaper", "more food", "no outdoor day 2", "less packed", "more heritage")
- ✅ Manual: remove item, regenerate day-trip, add-from-Explore link, delete trip
- ✅ `BudgetBar` — estimated vs (per-person × pax) budget, over-budget hint
- ✅ Itinerary versioning (v1 AI → v2+ edited)

## Phase 6 — Booking (demo)

- ✅ `types/booking.ts` (+ server-side `priceBooking`), `lib/validation/booking.ts`, `lib/domain/bookings.ts`
- ✅ `/book/[experienceId]` — date (leadtime-constrained) + time slot + pax steppers +
  lead-traveller + live price breakdown; price snapshotted server-side
- ✅ `submitBooking` → pending booking → `/bookings/[id]`
- ✅ `/bookings` list (upcoming / past+cancelled) · `/bookings/[id]` detail
- ✅ Cancel booking (pending/confirmed → cancelled); "Simulate payment (demo)" → confirmed (stands in for Phase 7)
- ✅ Verified end-to-end in browser: guest → plan → itinerary → refine → book → simulate pay → confirmed → My Bookings

## Phase 7 — Payment (mock provider)

- ✅ `lib/payments/types.ts` — `PaymentProvider` interface (createSession + verify)
- ✅ `lib/payments/mock.ts` — sandbox provider (in-app fake gateway); `stripe.ts` stub; `index.ts` factory from `PAYMENT_PROVIDER`
- ✅ `types/payment.ts`, `lib/domain/payments.ts` — `startPayment` (server-side amount snapshot) / `settlePayment` (only place a booking → confirmed)
- ✅ `/checkout/[bookingId]` (method picker + order summary) → `/checkout/gateway` (approve / fail / cancel) → `/checkout/[bookingId]/result`
- ✅ Own `app/checkout` layout (no bottom nav, "Secure checkout")
- ✅ `lib/email.ts` — booking-confirmation stub (logs until `RESEND_API_KEY`)
- ✅ `/api/payments/webhook` scaffold (real signature-verify + settle = `TODO(phase-7)`)
- ✅ Booking flow now: confirm booking → checkout → gateway → paid → confirmed → receipt logged → My Bookings
- ✅ Verified in browser incl. the email log line
- ⏭️ Real: `StripePaymentProvider` (test mode) + webhook handler + Resend template + Billplz (FPX)

## Phase 8 — Admin dashboard (demo)

- ✅ Mutable catalogue store (`lib/demo/catalogue-store.ts`) — admin edits flow straight to Explore
- ✅ `Vendor` type + `demoVendors` (incl. a `pending` one) + `demoLocations`; `isPublished` on Experience/Attraction
- ✅ `lib/domain/admin.ts` — list-all / save / delete / publish-toggle for experiences, vendors, attractions; vendor verification; booking status (any transition); users; `adminStats`
- ✅ `lib/validation/admin.ts` — Zod for all admin forms
- ✅ Admin nav bar + `/admin` overview (5 stat tiles, bookings-by-status bars, unverified-vendor alert, recent bookings)
- ✅ `/admin/experiences` list + `new` + `[id]/edit` (full form) + delete + publish toggle
- ✅ `/admin/vendors` list + verify/reject + `new` + `[id]/edit` + delete
- ✅ `/admin/attractions` list + `new` + `[id]/edit` + delete + publish toggle
- ✅ `/admin/bookings` list + `[id]` detail with guarded status transitions
- ✅ `/admin/users` list (demo personas + booking counts)
- ✅ Verified in browser: **full DoD** (guest → plan → book → pay → confirmed → My Bookings → admin sees & confirms the booking); vendor verify; experience publish toggle hides it from Explore
- 🐛 Fixed: multi-submit-button forms (persona switcher) — each button now its own `<form>` + hidden input
- ⏭️ Real: route `lib/domain/admin` through the Supabase service-role client; image upload to Storage; Supabase Auth admin API for users

## Phase 9 — Testing & security

- ✅ **Vitest** (`npm test`) — 45 unit tests: itinerary builder (incl. "AI never
  invents data" — every id in output exists in the catalogue), refinement rules,
  booking pricing, all Zod schemas, mock payment provider, formatters, rate limiter
- ✅ **Playwright** (`npm run test:e2e`) — 2 specs: the full golden path
  (guest → plan → itinerary → refine → book → pay → confirmed → My Bookings →
  admin sees & marks completed) and "guest can't reach /admin"
- ✅ **Security headers** in `next.config.ts` — CSP (dev-relaxed), HSTS, X-Frame-Options
  DENY, nosniff, Referrer-Policy, Permissions-Policy
- ✅ **Rate limiting** — `lib/rate-limit.ts` (in-process sliding window; Upstash swap
  is a TODO) on auth (12/5min per IP), AI generate (8/min), AI refine (20/min),
  booking (12/min) per user
- ✅ Server-side payment verification + amount snapshot (Phase 7) · ownership scoping
  via `requireUser()` + `user.id` everywhere
- ✅ `supabase/rls-check.sql` — audit script to run once Supabase is connected
- ✅ `npm audit` — 0 vulnerabilities
- ⏭️ Optional: Sentry (`NEXT_PUBLIC_SENTRY_DSN`); tighten CSP with per-request nonces

## Phase 10 — Deployment (deploy-ready)

- ✅ `docs/deployment.md` — Vercel steps + full env-var checklist + prod Supabase/payments notes + smoke test
- ✅ Legal: `/privacy` (PDPA-aware) + `/terms` (demo-data disclaimer); linked in the footer
- ✅ PWA: `app/manifest.ts` (id/scope), `app/icon.tsx` + `app/apple-icon.tsx` — installable
- ✅ SEO: `app/robots.ts` (disallows authed areas) + `app/sitemap.ts`
- ✅ Resilience: branded `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`
- ✅ `package.json` `engines.node = 22.x`; `lib/site.ts` picks up `VERCEL_PROJECT_PRODUCTION_URL`
- ✅ Verified: prod build (`next start`) serves `/`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, 404
- 🚫 Founder: import the repo at vercel.com → Deploy (runs in demo mode with zero env vars)

## UX pass (post-Phase-10)

- ✅ **Real photos** — 15 bundled in `/public/demo`, wired into fixtures; cards + detail heroes now use them (gradient fallback stays for anything without an image)
- ✅ **Conversational planner** — "Describe your trip" box → `lib/plan/parse-prompt.ts` (tested) pre-fills the form
- ✅ **Generation progress** — full-screen `GeneratingOverlay` with staged messages while the itinerary builds
- ✅ **Plan → book loop closes** — itinerary items show "Booked"/"Reserved"; trip → `booked` on payment; `TripReadiness` "X of Y booked" bar
- ✅ Toasts (refine, profile), `loading.tsx` skeletons (explore/trips/bookings/trip detail), budget presets, softer `SampleBadge`, login-card seam removed, booking email hint, hero contrast bumped
- ✅ **Booking date validated against availability** (server + inline client warning) — was a real gap
- ✅ 50 unit tests, 2 E2E, build all green

## Design pass 2 (visual craft)

- ✅ Design-system v2 in `globals.css`: violet-tinted elevation tokens
  (`shadow-card` / `shadow-float`), `.page-enter` navigation motion
  (reduced-motion aware), balanced headings, smoothed type
- ✅ **Catalogue cards** redesigned — photo-forward with scrim, price overlay,
  rating pill, vendor `Avatar` + name row, no redundant "View"
- ✅ **Itinerary** rebuilt as a real vertical timeline (spine + dots + time
  gutter + "Why" callouts, circled day numbers)
- ✅ **Experience detail** — "at a glance" stat grid, vendor card, sectioned
  body, prominent sticky price+CTA
- ✅ `components/common/avatar.tsx`; swapped 3 mismatched demo photos
- ✅ 50 unit / 2 E2E / build green
- ✅ **Admin desktop + analytics** — responsive shell (`components/admin/admin-sidebar.tsx`:
  sticky icon sidebar on `lg+`, horizontal tab strip below); dataviz-quality
  charts (`components/admin/analytics-charts.tsx`: weekly-bookings columns,
  weekly-revenue area, status + top-experiences H-bars, hover tooltips);
  `adminAnalytics()` in `lib/domain/admin.ts` (weekly buckets, 4-week deltas,
  confirmed rate, AOV); deterministic 11-week seed history
  (`lib/demo/seed-bookings.ts`) so the dashboard has shape on a fresh server
- ⏭️ Still queued: reviews/testimonials on experiences, per-day contextual
  refine, shared PriceBreakdown, dark-mode QA, admin date-range filter

## QA pass (professional-tester review)

- ✅ **Booking date default** — `BookingForm` now snaps the default date to the
  first day that is both past the leadtime and on a weekday the experience runs
  (`firstAvailableDate`). Form no longer opens disabled; removes an E2E flake.
- ✅ **Chip a11y** — `aria-pressed` / `aria-selected` + `focus-visible` ring on
  all toggle chips (plan interests/pace/budget, explore filters + tabs).
- ✅ **Explore search** — `type="search"` + `aria-label` (was placeholder-only).
- ✅ **Payment amount check** — `settlePayment` refuses to confirm a "paid"
  callback whose amount ≠ the server-snapshotted `payment.amount`; +2 unit tests
  (52 unit / 2 E2E / typecheck / lint green).
- ⏳ **Trip status never reverts from `booked`** — cancelling every booking on a
  trip leaves it `booked`. Needs a product call: auto-revert to `planned` vs.
  keep. Not yet done.
- ⏳ **Long trips go thin** — 10–14 day trips exhaust the 6-experience /
  8-attraction demo pool, so late days repeat "Free afternoon". Options: lower
  the cap (`lib/validation/trip.ts`, currently 14) or add more fixtures.

## Design & frontend polish pass

- ✅ **`brand` button variant** — one `<Button variant="brand">` / `buttonVariants`
  replaces ~13 hand-rolled `bg-brand-gradient text-white` combos (consistent
  hover/focus).
- ✅ **`<EmptyState>`** (`components/common/empty-state.tsx`) — icon chip + title +
  guidance + action; replaces bare `border-dashed` boxes on Bookings, Trips,
  Trip detail.
- ✅ **`<ConfirmSubmit>`** (`components/common/confirm-submit.tsx`) — inline
  two-step confirm for destructive actions; wired to Cancel booking + Delete trip
  (previously single-tap, no undo).
- ✅ **Trip status labels** — `TRIP_STATUS_META` (proper labels + tones), used on
  trip cards, trip detail, home; no more lowercased enum strings.
- ✅ **Card elevation** — TripCard / BookingCard / home cards moved to the v2
  `shadow-card → hover:shadow-float + -translate-y-0.5` language + focus-visible
  rings.
- ✅ **a11y** — `aria-current="page"` on the active bottom-nav tab; focus-visible
  rings on nav, card links, interest chips; `role="progressbar"` on trip readiness.
- ✅ **Trip readiness** — segmented track (one pill per experience) instead of an
  empty bar that read as broken at 0 booked.
- ✅ **Profile** — fields now in a card (matched the rest of the app), full-width
  brand CTA, "email can't be changed here" helper.
- ✅ **Trip card meta** — flex-wrap row; fixes the date-range line breaking mid-value
  at 375px.
- ✅ **Trip detail** — dropped the `v{n} · {requestSummary}` debug-looking line.

## Itinerary + trip-screen follow-ups (from the polish review)

- ✅ **Itinerary time-slotting** — `buildItinerary` now schedules each experience
  at its real `availability.times[0]` (the "Evening Walk" sits at 17:30, Bako at
  07:30) and never on a weekday the vendor doesn't run it; attractions skip their
  closed weekday (`openingHours` "Closed"); each full day is built into a
  conflict-free schedule (no overlapping items) with a guaranteed meal unless a
  food experience already covers dinner. +4 unit tests (real times, valid
  weekdays, no overlaps, museum-not-on-Monday).
- ✅ **Trip detail layout** — `BudgetBar` + `TripReadiness` merged into one
  `TripSnapshot` card (budget row · divider · booking progress); the itinerary
  now sits ~one card higher. Old two components removed.
- ✅ **Trip-list cards** — `TripCard` takes `featured`; the newest trip keeps the
  dark hero header, the rest render as light cards (status dot · title · meta ·
  "Day-by-day plan · N experiences") so a stack is scannable.
- ⏭️ Known limitations: `weekdayKey` shares the booking-gate's UTC-parse (fine on
  UTC hosting); a hypothetical experience starting >22:00 with a long duration
  would wrap past midnight and break the overlap math (no such fixture); attraction
  `openingHours` beyond a literal "Closed" key are still not parsed.

## User-flow pass — P0 (from the flow analysis)

- ✅ **Auth no longer throws away intent.** `proxy.ts` sets `x-pathname`;
  `requireUser()` redirects to `/login?next=<here>`; `login` / `register` /
  `continueAsGuest` / `enterDemo` honour it (`lib/nav.ts` `safeNextPath` blocks
  open-redirects — `//evil`, `https://…`, bouncing back to `/login`). Cross-links
  and the `emailRedirectTo` carry `next` too. +1 E2E (`?next` → destination),
  +4 unit tests.
- ✅ **Demo mode skips the login interstitial.** In demo, `proxy.ts` auto-starts a
  guest session for app routes (`/home /plan /explore /trips /bookings /profile
  /checkout /book`) — landing CTAs and deep links go straight in. `/admin` still
  routes through `/login`. +1 E2E (deep link → planner, no bounce).
- ✅ **Booking keeps the trip thread.** `?trip=` already flowed into
  `/book/*`; now the payment-result page, when the booking belongs to a trip,
  shows **"Book next: <experience>"** + **"Back to trip"**, or **"Your trip is
  all booked → See your trip"** when nothing's left — instead of dumping to the
  bookings list. Booking detail gains a "· <trip title>" link.
  `bookableExperiences(itinerary)` extracted to `types/trip.ts` (was duplicated in
  the trip page). +2 unit tests. Golden-path E2E updated for the new CTAs.
- ⏭️ Deferred (P1+): one-shot "book all N experiences · pay once"; itinerary-date
  vs bookable-date reconciliation; "trip confirmed" summary (calendar/share);
  one-shot plan-from-sentence; Explore↔trip `?trip=&day=` threading.

## Planner + schedule quality pass

- ✅ **Geography-aware days.** `buildItinerary` now shapes each full day as a
  **city day** or a **day trip** to one outlying area (Santubong / Bako /
  Semenggoh / Padawan), never mixed. Full-day, evening (Santubong cruise) and
  morning (Semenggoh, feeding-timed) excursions each get their own pattern; the
  free morning/afternoon windows draw only from the day's area. Back-to-back
  excursions are broken up with a city day.
- ✅ **Transfers.** `transport` items ("Transfer to Bako · ~55 min · ~RM100")
  bracket every excursion — travel time is now on the timeline and in the budget.
- ✅ **Notes are honoured.** `parseTripPrompt` extracts avoidances from negated
  clauses ("no museums", "we hate hiking", "not into shopping") → category / slug
  vetoes that filter the candidate pools. The trip hero echoes "You asked for: …".
- ✅ **Arrival day earns an evening experience** (e.g. the 17:30 food walk) so
  short trips aren't experience-free; a 2-day trip now gets ≥ 1 experience.
- ✅ **Better copy** — per-item "why" lines (specific, category-accurate) and day
  summaries that name the area + headline; neutral meal copy.
- ✅ **"Make it cheaper"** now trims only the single priciest day (was stripping
  every tour off the trip).
- +5 unit tests (avoid parsing, area coherence + transfers, note vetoes);
  golden-path E2E refine step switched to "Add more food" (guarantees a bookable
  item) with an exact "Book" locator. 70 unit / 4 e2e / build green.
- ⏭️ Deferred: children/elderly → downweight strenuous experiences; per-area
  half-day pairing (Semenggoh + a Santubong stop); one-shot plan-from-sentence;
  the real Claude call (`lib/ai/generate.ts`, needs the API key).

## "Fix all 5" pass (from the second app analysis)

- ✅ **Domain test coverage.** `lib/domain/{bookings,trips,admin,catalogue,reviews}`
  had no direct unit tests despite being where a silent regression matters
  most. +33 tests (price snapshot, weekday/pax gates, per-user isolation,
  vendor-ref sync, admin any-transition, catalogue sort stability).
- ✅ **Admin catalogue forms actually manage content.** Experience/attraction/
  vendor forms never exposed images, includes, languages, cancellation policy,
  or vendor avatar — a UI-created experience shipped with an empty gallery and
  no "what's included" forever. `parseList()` in `lib/domain/admin.ts` splits
  the new comma/newline fields; forms brought to the app's visual language.
- ✅ **Explore sort.** `sort` URL param → Recommended / Top rated / Price
  low→high / high→low, through `lib/domain/catalogue` (sorts a copy, never
  mutates). "Top rated" hidden on Attractions (no rating field).
- ✅ **Traveller reviews.** New `lib/domain/reviews.ts` + global reviews store
  (5 seeded); `ratingSummary()` blends the catalogue baseline with in-app
  reviews; one review per traveller per experience, gated on a confirmed/
  completed booking. Experience detail page gets a reviews section (blended
  rating, list, star+text form or the lock reason). +6 unit tests.
- ✅ **Dark mode wired.** The full `.dark` token set existed but nothing applied
  it. `components/theme-provider.tsx` (next-themes, system preference); Sonner
  reads the real theme again; fixed one white-on-white pill. QA'd across the
  key screens.
- ⏭️ Follow-ups: a Light/System/Dark toggle (Profile → Account); update the
  Explore/Home cards to the blended rating; per-review admin moderation.

## Admin usability pass

- ✅ **Deletes confirm.** One-click trash on the catalogue list rows removed;
  Delete moved to the edit page as a two-step `<ConfirmSubmit>`; delete actions
  redirect to the list.
- ✅ **Bookings screen** — summary strip (total / pending / confirmed / settled
  revenue), status filter chips + customer/email/ref search (URL-synced via
  `components/admin/booking-filters.tsx`).
- ✅ **Catalogue lists** — `CoverImage` thumbnails, `shadow-card`, brand "New"
  buttons; vendors list floats pending/unverified to the top with an
  "N awaiting review" cue + avatars.
- ✅ `mailto:` (pre-filled subject) on the admin booking detail customer email.
- ⏭️ Still queued: experiences/attractions list search + filter; admin
  date-range filter on the dashboard; per-review moderation; real Supabase
  service-role wiring for all `lib/domain/admin` writes.

## Android APK (Capacitor shell)

- ✅ `capacitor.config.ts` + `android/` project; `npm run android:apk` builds a debug
  APK (`com.sarawaktrip.app`, min Android 7, INTERNET only, 4 MB).
- ✅ Loads the app from `CAP_SERVER_URL` (LAN dev server today, https once deployed);
  `capacitor-www/offline.html` for unreachable server / WebView < Chrome 111.
- ✅ Verified on an Android 11 emulator: installs, launches, reaches the LAN server,
  old-WebView fallback renders. **Not yet verified:** the real UI in a modern
  WebView on a device (emulator image is stuck on Chrome 83).
- ⏭️ Deploy to https and rebuild against it; release keystore + `.aab` for Play;
  launcher icon + splash; native niceties (status-bar colour, back button).
- Decision change: V1 is no longer "web-only PWA" — the PWA stays, plus this APK.

## Going real — Step 1: database foundation ✅ DONE

- ✅ **Live on Supabase project "Ai Sarawak"** (`tuwbkgworagassllvsqy`, ap-northeast-1): all 9
  migrations applied (remote history renamed to match the local filenames so
  `supabase db push` stays consistent), seed loaded (7 categories · 5 locations ·
  8 attractions · 5 vendors · 6 experiences · joins · images · rating baseline · avatars).
  17 tables, RLS on every one.
- ✅ **Migrations tested before touching the project.** `tests/db/` runs every migration +
  seed on an in-process Postgres (PGlite; Supabase roles / `auth.uid()` / default grants
  stubbed) — 21 tests: schema, catalogue visibility, role protection, cross-user
  isolation, money-table lockdown, function exposure, reviews.
- 🐛 **Security hole found & never shipped.** Original `0005` let any signed-in user (incl.
  anonymous guests) insert a `confirmed` RM0 booking or rewrite a booking's price via
  PostgREST with the public key. `0005` now has read-only booking policies + revokes writes
  on bookings/payments/status history (server-only, service role); `0008` also revokes
  TRUNCATE/REFERENCES/TRIGGER from client roles and all writes from `anon`.
- ✅ `0007` reviews table (public read, server-only write, unique per traveller, 1–5) +
  `experiences.rating/review_count` baseline + `vendors.avatar_url`.
- ✅ `0009` hardened functions from the Supabase advisor: `set_updated_at` fixed search_path;
  trigger functions no longer callable via `/rest/v1/rpc/*`. Remaining advisor note:
  `is_admin()` is executable by anon/authenticated **on purpose** (RLS policies call it as
  the caller; it only reports on the caller).
- ✅ **Verified against the live API with the public key:** anon reads catalogue (7 / 6 rows),
  sees no bookings/reviews; anon INSERT booking → `42501`; anon PATCH price → `42501`;
  trigger function → 404.
- ✅ **Anonymous sign-ins enabled; service-role key in `.env.local`** (verified: secret key
  passes an admin-only call, public key is refused). **Signed-in guest attack test on the
  live project:** RM0 `confirmed` booking insert → refused (`42501`); self-promote to admin →
  refused ("not allowed to change role"); review without a booking → refused; own profile
  read + own trip insert → work. Test user deleted afterwards.
- ⏭️ `types/database.ts` regenerated from the live schema at the start of Step 2 (it will be
  wired into the typed client there, where any typecheck fallout gets handled).
- ⏭️ Seed ↔ fixtures parity (Step 2): the demo has a 6th (pending) vendor, 15 bundled photos
  and per-item images that the seed doesn't yet.
- Known: vendor `contact` (email/phone) is readable by anon for published vendors —
  decide in Step 2 whether to move it out of the public row.
- Note: `NEXT_PUBLIC_DEMO_MODE=true` is still set in `.env.local`, so the app still runs on
  demo data until Step 2 flips it.

## Going real — Step 2: wire the app to the database (in progress)

- ✅ **2.0 Real generated types** (`types/database.ts`, from the live schema) — the typed
  client compiles with zero fallout.
- ✅ **2.1 Catalogue + review reads on Supabase.** `lib/supabase/public.ts` (anon client, no
  cookies), pure mappers `lib/domain/mappers/catalogue.ts` (unit-tested: junk jsonb,
  numeric strings, unknown categories, image ordering, uuid guard), real branches in
  `lib/domain/{catalogue,reviews}`. Errors throw (no silent empty Explore); malformed ids
  from URLs → "not found", never a Postgres 22P02. Only published rows / published vendors
  are visible (RLS + `vendors!inner`). Seed now matches the demo (14 bundled photos).
- ✅ **Verified for real:** `npm run test:live` (6 tests, real domain code vs the live project)
  and the actual app in real mode — guest login through real Supabase Auth, `?next`
  preserved, Explore + experience detail rendered from the live DB.
- 🐛 Fixed: the guest action blamed "Anonymous sign-ins disabled" for *any* failure (it was a
  network error). It now only says that for `anonymous_provider_disabled`, and logs the real
  cause.
- 🖥️ **This PC:** Avast re-signs HTTPS and tells only the Node processes it monitors, so a dev
  server started by another tool failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. `npm run
  dev:real` now passes `DEV_EXTRA_CA_CERTS` (in `.env.local`) as `NODE_EXTRA_CA_CERTS` —
  verification stays ON. Never use `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- ✅ **2.2 Trips on Supabase.** Migration `20260926100001`: `save_itinerary` / `create_trip`
  SQL functions — the whole trip → itinerary → days → items tree in ONE transaction, run as the
  signed-in user (SECURITY INVOKER, so RLS enforces ownership), trip row locked so concurrent
  saves serialise, version assigned by the database, "one current itinerary per trip" is a
  unique index. A failed save leaves the previous itinerary untouched (tested). Items now
  carry `attractionId` (a slug can go stale). `lib/domain/{trips,mappers/trips}` wired; budget
  stored as the group total (per person × travellers). **Verified:** 9 SQL tests (PGlite),
  8 mapper tests, and 5 live tests with real guest users (build → save → read back identical,
  refine → v2, remove item, status, cross-user isolation, delete cascade); test users deleted.
- ✅ **2.3 Bookings + payments on Supabase (the money path).**
  Migrations `…100002` / `…100003`: bookings snapshot the listing (title/slug/vendor/location)
  like the price; a CHECK makes the money add up in the database (`total = subtotal + fee`,
  `subtotal = unit × pax`); `settle_payment(...)` — the ONLY way a payment becomes `paid` and a
  booking `confirmed`: one transaction, payment + booking rows locked, idempotent (a retried /
  replayed callback can't confirm or email twice — the caller learns whether *it* confirmed),
  amount checked against the snapshot taken at `startPayment`, a paid callback for a booking
  cancelled mid-payment never revives it (logged "refund needed"), the return path can only
  settle its own payment, and only the service role may execute it. Reads go through the
  traveller's own client (RLS + explicit `user_id`); writes go through the service role (clients
  have no write privilege — migration 0008). A booking can only attach to the caller's own trip.
  Travellers can only *cancel*, with the guard in the UPDATE's WHERE clause (atomic).
  **Mock-gateway guard:** `PAYMENT_PROVIDER=mock` now refuses to run in production against a real
  database unless `ALLOW_MOCK_PAYMENTS=true` (the fake gateway lets the traveller pick "approve").
  **Verified:** 19 SQL tests (PGlite; every settle edge case), 10 unit tests, 11 live tests with
  real guests (create → snapshot, rules, trip ownership, start → settle → confirmed + one email,
  tampered amount, cancel/fail/retry, stranger's ref, paid-after-cancel, cancel guards, junk ids).
- ⚠️ Known gaps (product decisions, not bugs): **capacity per slot is not enforced** (same as demo;
  needs a "pending hold" policy), **refunds** for cancelled confirmed bookings and for
  paid-after-cancel are logged, not processed (needs the provider's refund API), and
  `/api/payments/webhook` still only ACKs (Step 5: signature verification, then
  `settlePayment(null, …)`).
- ✅ **2.4 Reviews write + gate.** `addReview` inserts with the service role (clients have no
  write privilege on `reviews`); migration `…100004` adds a BEFORE INSERT trigger so the booking
  gate ("confirmed or completed booking for THIS experience") is enforced by the database too —
  even the service role can't skip it; unique-per-traveller races land as a friendly message.
  +3 SQL tests (gate matrix), +1 live test (pending doesn't count → confirmed does → one review →
  blended 4.9 over 129 → duplicate refused → non-booker refused → raw service-role insert refused).
- ✅ **2.5 Admin on Supabase — under the admin's OWN session, not the service role.** RLS
  `is_admin()` is the authority, so a forgotten `requireAdmin()` can't escalate and every change
  is attributed to the real admin. Migrations `…100005/6`: `admin_save_experience/attraction/vendor`
  (one transaction each: row + category links + ordered photos; slugs kept unique, never changed on
  edit; rating/sample flag/opening hours preserved; unknown vendor/location refused, never
  invented), `admin_set_vendor_verification` (stamps who/when), and admins may change a booking's
  **status only** (column-level grant — never the money; history records the admin). Deleting
  something that has bookings fails with "unpublish it instead" (`AdminError` → message on the edit
  page). The service role is used for one thing: user emails (auth system). Analytics maths is now
  one pure function shared by demo + real; big lists are paged (fail loudly past 20k rows).
  Forms load real locations (were demo fixtures); vendor location is a dropdown.
  `tests/unit/admin-guard.test.ts` statically enforces `requireAdmin()` as the first line of every
  admin action + the layout.
- 🐛 **Found by the live tests and fixed:** (1) photos (`images`, polymorphic owner) were left behind
  when an experience/attraction/vendor was deleted — now removed by triggers + existing orphans
  swept (`…100006`); (2) Supabase returns `""` (not null) for an anonymous user's email — normalised
  in `lib/auth.ts` and the admin user list.
- **Verified:** 22 more SQL tests (admin functions, permissions, photo cleanup), admin mapper +
  guard unit tests, 10 live tests as a real admin (create → public catalogue → edit → hide → delete,
  sold-item protection, status changes named in history, dashboard adds up, user list).
- Advisor (expected, by design): `is_admin()` callable (RLS uses it); "anonymous access policies"
  (guests are anonymous users; every policy is owner-scoped); **leaked-password protection is off**
  — a dashboard setting (Auth → password security; Pro plan) to enable before launch.
- ✅ **Browser pass of the real-mode admin** (real Supabase Auth session promoted to admin, then
  removed): dashboard renders from the live DB; experiences list; new-experience form offers the
  real vendors + locations; **created an experience through the actual form** (row, photo, category,
  `created_by` = the admin all correct) and **deleted it through the real confirm flow** (row, photo
  and links all gone). 🐛 Found there: the admin price fields only accepted multiples of RM 10
  (experience) / whole ringgit (attraction) — now sen precision (`step="0.01"`).
- ⏭️ Step 2 is functionally complete. Next: Step 3 (deploy). `.env.local` keeps `NEXT_PUBLIC_DEMO_MODE=true` (E2E + UI work run on demo);
  `npm run dev:real` runs the real backend, and a Vercel deploy with Supabase env vars is real by default.
  (atomic DB functions; `settlePayment` idempotent) · 2.4 reviews write + booking gate ·
  2.5 admin via service role · then flip `NEXT_PUBLIC_DEMO_MODE=false`.
- Known: in real mode `getExperienceById` only sees PUBLISHED experiences (a booking can't be
  started against something unpublished); demo mode still returns any id.
- Test data: one guest user exists in the live project from the real-mode login test.

## Going real — Step 3: deploy ✅ (staging)

- ✅ **Live at https://sarawak-trip-planner.vercel.app** (Vercel project `sarawak-trip-planner`, team
  `heonhitengs-projects`, connected to GitHub → every push to `main` auto-deploys). Set up with the
  Vercel CLI: `vercel link` created the project + Git connection; `scripts/vercel-env.mjs` pushed the
  production env vars from `.env.local` without printing values (service-role key stored as
  *sensitive*; dev-only vars deliberately not sent).
- ✅ Pre-flight: production build in real mode (40 routes) passes.
- ✅ **Verified on the live URL:** health 200; signed-out `/explore` & `/admin` → `/login?next=`;
  CSP allows the Supabase host + `upgrade-insecure-requests`; HSTS + X-Frame-Options; real guest
  login → Explore lists the 6 experiences from the DB; **full money path in production** — booking
  RM 300 + 6% fee = RM 318 (server-side) → mock gateway → confirmed; DB shows booking `confirmed`,
  payment `paid` (RM 318), one `pending→confirmed` history row. Test data deleted afterwards.
- ⚠️ **Staging only:** payments are the fake gateway (`ALLOW_MOCK_PAYMENTS=true` is what lets it run in
  production; remove it once a real provider is wired).
- ⏳ **Founder, Supabase dashboard:** Auth → URL Configuration → Site URL
  `https://sarawak-trip-planner.vercel.app` + redirect `…/**` (needed for the Register
  email-confirmation link; guest login works without it); enable leaked-password protection.
- ⏭️ Rebuild the Android APK against the https URL (`CAP_SERVER_URL=https://sarawak-trip-planner.vercel.app`);
  create the first real admin (register → promote); Step 4 (Claude planner, Resend, Upstash, Mapbox).

## App entry: no landing page

- ✅ **"/" is an app entry, not a website.** No marketing page: signed out → `/login` (which offers
  "Continue as guest"), signed in → `/home` (`app/(marketing)/page.tsx` is just the redirect).
  Landing page + `HeroPreview` deleted; sitemap no longer lists "/"; the legal pages (`/privacy`,
  `/terms` — needed for PDPA and the Play Store) stay, with a slimmed header ("Open app") and
  Privacy / Terms links under the sign-in card. +2 E2E tests (root redirects both ways; legal pages
  reachable from sign-in). The Android app opens straight to sign-in for the same reason.

## Slot capacity (no overbooking)

- ✅ **A slot = experience + date + start time; its size = `capacity_per_slot`** (unset/0 = unlimited,
  as before). Migration `20260927100001`: `create_booking()` locks the experience row, counts the
  slot's taken seats and inserts or refuses in ONE transaction — so two people can't both take the
  last seat. Confirmed/completed bookings and **unexpired unpaid holds** take seats; cancelled,
  refunded and lapsed ones don't. Unpaid bookings hold their seats **30 minutes**
  (`lib/booking-hold.ts`); no clean-up job — expired holds are simply not counted.
- ✅ **Checkout renews the hold** (`extend_booking_hold`) if seats remain, else "that time filled up".
  **Paying after the hold lapsed AND the slot filled:** the booking is cancelled (never overbooked),
  the payment stays `paid` and is logged "refund needed" (`settle_payment` updated; consistent
  lock order experience → booking, so the functions can't deadlock). All four functions are
  service-role only.
- ✅ Friendly messages: "Only 2 seats left for that time…" / "fully booked". Demo mode mirrors the
  same rules (`demoSlotLeft`).
- **Verified:** 17 SQL tests (exact fill, refusal + seats left, independent slots, unlimited, which
  statuses hold seats, expiry, renewal, late payment ×3, permissions), 8 demo unit tests, and 5 live
  tests on the real DB — including **six people booking the last seats at the same instant: exactly
  four get one, never more than capacity**.
- ⏭️ Not done: stale unpaid bookings still *display* "Awaiting payment" after their hold lapses (they
  no longer block anyone); a small "expired" label / daily cleanup would tidy the lists.

## "Make sure the app works" pass (real backend, in a browser)

- ✅ **`npm run test:e2e:real`** (`playwright.real.config.ts`, `tests/e2e-real/`) — a browser drives the
  app with demo mode OFF: real Supabase guest sessions, real database, real SQL functions. Covers
  **explore (6 experiences, search, attractions) → experience page → plan → refine → book from the trip →
  checkout → fake gateway → confirmed → bookings list/detail → trip shows "booked" → review (gated) →
  cancel (two-step) → guest profile → sign out → signed-out routes bounce to login**; a guest can't
  reach `/admin`; **admin with a real email + password** (wrong password refused with a message, email
  kept), profile save persists, dashboard, create an experience through the form (RM 45.50), it shows
  on Explore, delete it (two-step), see/manage the traveller's booking, users/vendors/attractions
  render. Deletes everything it created. Can target a deployment: `E2E_BASE_URL=https://…`.
- 🐛 **Found & fixed:** a wrong password **wiped the email field** (React clears uncontrolled fields
  after a server action) — sign-in/register and the guest "Save your account" form now keep name +
  email (password still clears). Now a permanent regression assertion.
- ✅ Also confirmed by the run: unpublished (draft) experiences are hidden from travellers; the
  guest profile shows the real trip/booking counts.

## "All four free items" pass (admin attention, photo upload, Play prep, security & polish)

- ✅ **Admin "needs attention"** (`lib/admin-attention.ts`, `components/admin/needs-attention.tsx`): the
  overview lists **refunds owed** (booking cancelled but the payment is still `paid` — e.g. paid after the
  seat hold lapsed and the slot filled), **lapsed unpaid** holds, and vendors awaiting verification, or an
  "All clear". Admin can now move Cancelled → Refunded to record a refund (which clears the item).
- ✅ **Photo upload** in the experience / attraction / vendor forms (`components/admin/photo-field.tsx`):
  upload from the device (shrunk to ≤1600 px WebP in the browser → Storage bucket `catalogue`, admin-only
  by RLS) or paste a link; "Make cover"; removing a just-uploaded photo deletes the file. Migration
  `20260926080032_catalogue_bucket_limits` (applied live): catalogue bucket 5 MB JPG/PNG/WebP only (no SVG),
  avatars 2 MB. Known gap: replacing/removing an already-saved photo leaves the old file in the bucket.
- ✅ **Google Play preparation** — see `docs/play-store.md`: brand mark (`brand/mark.json`) → launcher icons
  (adaptive + round), gradient splash, `npm run android:assets`; release signing + `npm run android:aab`
  (verified end-to-end with a throwaway key: signed APK + AAB); versionCode bumping; `allowBackup=false`;
  store icon, feature graphic, 5 phone screenshots (`npm run play:screenshots`) and listing copy in
  `store/play/`; Data-safety / content-rating / launch checklist. **Play requires account deletion**, so it
  was built: Profile → *Delete my account* (typed `DELETE`; refused while a confirmed booking is upcoming, a
  refund is owed, or for admins) + public `/delete-account` page + privacy-policy text.
- ✅ **Security & polish**: **nonce-based CSP** (no inline scripts; `lib/csp.ts`, set in `proxy.ts`; verified on
  a production build with zero violations); `X-Powered-By` off; travellers see **"Hold expired"** instead of
  a stale "Awaiting payment"; **axe accessibility scan** of every main screen (`tests/e2e/a11y.spec.ts`) — fixed
  unlabeled stepper/budget/description controls and low-contrast amber/green text; LCP image priority; profile
  form controlled (kills a Base UI warning).
- 🧪 New tests: unit (attention rules, photo helpers, account-deletion rules, CSP, hold-lapsed), DB (bucket
  limits), live (storage RLS + limits, account deletion), real-browser (upload + attention + guest deletion),
  a11y. Totals: unit+DB **265**, live **47**, demo E2E **9**, real E2E **4**.
- ⚠️ Not verifiable here: the APK running the real app — the only emulator image ships WebView 83 (< 111 floor),
  so it shows the friendly "can't open" screen. Splash and icon were checked on it; try the APK on a real phone.

## Claude planner (built, dormant until a key)

- ✅ `lib/ai/brief.ts` (schema + `sanitizeBrief` + `applyBrief`), `lib/ai/claude.ts` (Sonnet brief, Haiku edit
  interpreter, SDK `messages.parse` + zod output format), wired in `lib/ai/generate.ts`. The model returns only
  catalogue slugs (enum + re-checked) and one short reason each; the builder does all scheduling and prices, so
  it can't invent a place/price/time. Vetoes always win; a brief can't empty the catalogue; any error/timeout/no
  key => the deterministic planner. Traveller notes go in as quoted data with an injection-resistant system prompt.
- ✅ Refine: rules first; only if they can't map the request does Haiku rephrase it into a command the rules run.
- ✅ 24 new unit tests (fake client) + a live test that skips without a key.
- ⚠️ Not verified against the real API (no key here): run `npm run test:live` after adding one.

## Government guide: must-see + local food guide (free, no paid services)

- ✅ **Must-see ranking** for attractions (`featured_rank`, admin field "Must-see rank"): badge on cards + detail page,
  ranked places listed first on Explore, and a nudge in the planner. Live DB ranked: Semenggoh 1, Cultural Village 3,
  Bako 5, Waterfront 6.
- ✅ **Local food guide**: 30 places (Kuching 12, Sibu 7, Miri 7, Bintulu 4) with dish, $/$$/$$$ tier, splurge flag and a
  Google Maps link, from the guide you shared. **Explore → Food** tab (filter by city / dish / search, "Open in Maps");
  **Admin → Food guide** (add / edit / publish / delete). No RM prices shown: tiers only.
- ✅ **Planner uses it**: lunches/dinners name a real Kuching place (lunch leans laksa/kolo mee, dinner umai/pansoh/midin;
  each place once before repeating; tight budget never above $$; the last evening of a 3+ day trip is a splurge). Meal
  cost is a labelled rough estimate per tier (RM12 / 30 / 65; splurge 90) — the guide gives tiers, not prices.
- ✅ **Kuching-region guard**: a Kuching itinerary never includes places outside Kuching (Miri/Mulu/Niah/Lambir).
- 📝 **Drafts to finish** (unpublished, admin → Attractions): Gunung Mulu (rank 2), Niah Caves (4), Lambir Hills (7),
  Kuching Wetlands (8, entry ~RM10). Only what the guide says is filled in — add photos, real price, hours and visit
  length before publishing (Mulu/Niah/Lambir won't appear in Kuching plans until multi-city exists).
- 🐛 Fixed: two quick taps on Explore filters could overwrite each other.
- ⏭️ Not done (needs a decision or money): multi-city planning (Miri/Sibu/Bintulu trips), halal / vegetarian info per eatery,
  opening hours, photos for eateries, a "Google Maps link" inside the itinerary item (needs a DB column).

## Stripe payments (built, dormant until keys)

- ✅ `lib/payments/stripe.ts`: hosted Checkout Session for exactly the server-side amount (sen, MYR), card / FPX /
  GrabPay; webhook + return-URL verification; async methods (pending -> paid/failed); expired -> cancelled.
- ✅ `/api/payments/webhook`: raw-body signature check (400 on forged/tampered/stale), unrelated events 200-ignored,
  real failures 500 so Stripe retries. Result page settles on return by re-fetching the session from Stripe.
- ✅ Gateway failure => a friendly message, booking untouched (was a crash). Android shell allows `*.stripe.com`.
- ✅ Tests: 15 unit (fake API + REAL signature checks) and 8 live (webhook -> real DB: confirms once, replay is a no-op,
  forged/tampered/wrong-amount/unknown confirm nothing, pending -> paid, paid can't be un-paid).
- ⚠️ Not exercised against Stripe's real servers (no keys here): after adding test keys, book + pay with 4242… once.
- ⏭️ Refunds stay manual (Stripe dashboard, then mark the booking Refunded). FPX/GrabPay need a Malaysian Stripe account.

## Blocked / needs the founder

- 🚫 **Payment gateway (live)** — needs SSM business reg + bank account + gateway approval. Build proceeds on `mock` / sandbox.
- 🚫 **Supabase project** — need URL + anon key + service-role key to verify Phase 2.
- 🚫 **Anthropic API key** — needed before Phase 4.
- 🚫 **Mapbox token** — needed before Phase 3 maps.
- 🚫 **Google OAuth consent screen** — needed for "Sign in with Google" (Phase 2, optional).

## Decisions locked

- PWA + Capacitor Android APK for V1 (thin shell over the web app; no native rewrite).
- LLM = Anthropic Claude. Maps = Mapbox. No ORM. Package manager = npm.
- V1 geography = Kuching / Sarawak only.
