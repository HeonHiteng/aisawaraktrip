# Build checklist

Legend: ✅ done · 🔨 in progress · ⏭️ next · 🚫 blocked

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | Project setup & architecture | ✅ |
| 2 | Database & authentication | 🔨 (code done — needs Supabase project to verify) |
| 3 | Explore (attractions / vendors / experiences) | 🔨 (demo done; Supabase wiring pending) |
| 4 | AI Trip Planner | 🔨 (demo done; real Claude call pending API key) |
| 5 | Itinerary management | 🔨 (demo done; Supabase persistence pending) |
| 6 | Booking system | 🔨 (demo done; Supabase pending) |
| 7 | Payment integration | 🔨 (mock provider working; Stripe/Billplz + webhook pending) |
| 8 | Admin dashboard | 🔨 (demo done; Supabase service-role wiring pending) |
| 9 | Testing & security | 🔨 (tests + headers + rate limiting done; Sentry optional) |
| 10 | Deployment | 🔨 (deploy-ready; founder does the Vercel import) |

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

## Blocked / needs the founder

- 🚫 **Payment gateway (live)** — needs SSM business reg + bank account + gateway approval. Build proceeds on `mock` / sandbox.
- 🚫 **Supabase project** — need URL + anon key + service-role key to verify Phase 2.
- 🚫 **Anthropic API key** — needed before Phase 4.
- 🚫 **Mapbox token** — needed before Phase 3 maps.
- 🚫 **Google OAuth consent screen** — needed for "Sign in with Google" (Phase 2, optional).

## Decisions locked

- Web-only PWA for V1 (no native apps).
- LLM = Anthropic Claude. Maps = Mapbox. No ORM. Package manager = npm.
- V1 geography = Kuching / Sarawak only.
