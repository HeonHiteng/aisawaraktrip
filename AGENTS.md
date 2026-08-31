<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Sarawak Trip Planner — project guide

AI-powered tourism app for Kuching / Sarawak. Tourists get an AI-generated,
DB-grounded itinerary, browse verified experiences, book, and pay. Admins manage
the catalogue and bookings.

## Stack

- **Next.js 16** (App Router, RSC, Server Actions) + **React 19** + **TypeScript**
- **Tailwind v4** + **shadcn/ui** (`base-nova` style, `@base-ui/react`)
- **UI design follows `docs/design-system.md`** (from the product proposal): violet→magenta
  brand, dark-violet hero surfaces, pill chips/buttons, geometric sans (Geist), mobile-first.
  Use CSS tokens, never hard-coded hex. `bg-brand-gradient` = hero CTAs only;
  `bg-brand-hero` = dark headers/hero.
- **Supabase** — Postgres + Auth + Storage + RLS (Phase 2+)
- **Anthropic Claude API** — `claude-sonnet-5` planner, `claude-haiku-4-5` refine (Phase 4)
- **Mapbox GL** maps (Phase 3) · **Upstash** rate limiting · **Resend** email
- Payments: `lib/payments/` provider interface + `mock` (in-app fake gateway) now →
  Stripe test → Billplz. `settlePayment` (`lib/domain/payments`) is the ONLY place a
  booking flips to `confirmed`; real mode does it in `/api/payments/webhook` after
  signature verification. Amounts are snapshotted server-side, never from the client.
- Hosting: **Vercel**

## Next.js 16 gotchas (already bit us / will)

- `cookies()`, `headers()`, `params`, `searchParams` are **async** — always `await`.
- Middleware is now **`proxy.ts`** with an exported `proxy()` fn, **nodejs runtime only**.
- `next lint` is gone — use `npm run lint` (`eslint` directly). `next build` does not lint.
- Turbopack is the default bundler for `dev` and `build`.
- Use generated route-type helpers: `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext<'/route'>`. Run `npx next typegen` if types go stale.

## Conventions

- **Secrets**: anything not prefixed `NEXT_PUBLIC_` is server-only. Never import
  `lib/supabase/admin`, AI, or payment secret modules into a client component.
- **Validation**: every input boundary (form, Server Action, route handler) parses
  with a Zod schema from `lib/validation/`.
- **Data access**: go through `lib/domain/*` — each function serves demo fixtures
  when `DEMO_MODE` (`lib/demo/mode.ts`) and Supabase otherwise, returning the same
  `types/catalogue.ts` shapes. Screens never call Supabase directly.
  Supabase JS client + raw SQL migrations in `supabase/migrations/`. No ORM.
  Regenerate `types/database.ts` with `supabase gen types` after a migration.
- **Demo mode**: whole app runs on `lib/demo/fixtures.ts` + a cookie session
  (`lib/demo/session.ts`, personas guest/tourist/admin). Trips/bookings/payments in
  `lib/demo/store.ts`; the admin-editable catalogue in `lib/demo/catalogue-store.ts`
  (edits flow to Explore). Keep every new screen working in demo mode — add fixtures
  + a `lib/domain` demo branch.
- **Multi-button forms**: a `<form>` with several `<button type="submit" name=…>` does
  NOT reliably pass the submitter's value to a Server Action. Give each button its own
  `<form>` + a hidden input instead.
- **Admin** reads/writes go through `lib/domain/admin.ts` (service-role in real mode).
  Admin booking status changes bypass the tourist-side transition guard by design.
- **AI must never invent data.** `lib/ai/` retrieves candidate records from the DB,
  constrains the model to them, and `validate.ts` rejects any ID/price not in the DB.
  Today `lib/ai/itinerary.ts` is a deterministic builder over catalogue records;
  the Claude call slots into `lib/ai/generate.ts` (`TODO(phase-4)`), same output shape.
- **Trips/bookings** flow through `lib/domain/{trips,bookings}` → in-memory
  `lib/demo/store.ts` in demo mode, Supabase otherwise. Booking prices are
  snapshotted server-side in `createBooking`, never from the client.
- **Auth helpers**: `requireUser()` / `requireAdmin()` from `lib/auth.ts` (Phase 2).
- **Guest users** are real Supabase anonymous users (`user.is_anonymous === true`)
  with a normal `auth.uid()` — RLS treats them like any user. They can upgrade to
  email+password from `/profile` (same user id, data preserved).
- **Money**: integers or `numeric` in DB, MYR only. Never trust a price from the client
  or the model — snapshot from the DB at write time.
- Sample/demo catalogue rows carry `is_sample = true` and must be visibly labelled.

## Commands

```
npm run dev        # Turbopack dev server on :3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Status

See `TODO.md` for the phase checklist (Completed / In progress / Next / Blocked).
