# Sarawak Trip Planner

AI-powered tourism app for **Kuching & Sarawak, Malaysian Borneo**. Tourists
describe their trip, get a day-by-day itinerary built **only from real, verified
attractions and local operators**, browse experiences, book, and pay online.
Admins manage the catalogue and bookings.

> MVP in active development. Catalogue data is demo/sample data (`is_sample = true`).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Server Actions), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui |
| Data / auth | Supabase (Postgres, Auth, Storage, RLS) |
| AI | Anthropic Claude (`claude-sonnet-5` / `claude-haiku-4-5`) |
| Maps | Mapbox GL |
| Email | Resend · Rate limiting: Upstash |
| Payments | Provider interface — `mock` → Stripe (test) → Billplz |
| Hosting | Vercel |

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in as each phase needs it
npm run dev
```

Open http://localhost:3000. Health check: http://localhost:3000/api/health

### Demo mode

With no Supabase configured the app runs in **demo mode**: fixture catalogue data,
an in-memory session store, nothing persisted. Click "Continue as guest" on `/login`,
then use the **View as: Guest / Traveller / Admin** switcher in the banner. Set
`NEXT_PUBLIC_DEMO_MODE=false` once Supabase is wired up.

The full V1 flow works in demo mode: **Plan** a trip → AI itinerary from real
catalogue records → **refine** in plain language → open an experience → **book**
→ **checkout** (FPX / card / e-wallet, test mode) → mock gateway → **confirmed** →
**My Bookings** → switch to **Admin** and see / manage the booking, plus catalogue
CRUD (experiences, vendors, attractions), vendor verification and analytics.
Trips/bookings/payments/catalogue-edits live in per-process in-memory stores
(`lib/demo/`) and reset when the dev server restarts.

## Database setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com) (region: Singapore).
2. Project Settings → API — copy into `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Apply the schema + seed:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npm run db:push          # runs supabase/migrations/*
   # then paste supabase/seed.sql into the Supabase SQL Editor and run it
   npm run gen:types        # regenerates types/database.ts
   ```
   (Or skip the CLI: paste each migration file, then `seed.sql`, into the SQL Editor in order.)
4. Auth → Providers → Email: turn **"Confirm email" off** for faster local testing.
   Auth → Providers: enable **Anonymous sign-ins** (powers "Continue as guest").
   Auth → URL Configuration: Site URL `http://localhost:3000`, add redirect `http://localhost:3000/**`.
5. Make yourself an admin after first sign-up:
   ```sql
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
   ```

## Scripts

```bash
npm run dev        # dev server (Turbopack)
npm run build      # production build
npm run start      # serve production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # unit tests (Vitest)
npm run test:e2e   # end-to-end golden path (Playwright, demo mode)
```

## Project layout

```
app/
  (marketing)/     public landing
  (auth)/          login / register            (Phase 2)
  (app)/           authenticated tourist app   (Phase 3+)
  admin/           admin dashboard             (Phase 8)
  api/             route handlers
lib/
  supabase/  ai/  payments/  domain/  validation/
supabase/
  migrations/  seed/
components/  ui/ (shadcn) + feature components
```

See `AGENTS.md` for conventions, `TODO.md` for the phase checklist,
`docs/design-system.md` for UI, and `docs/deployment.md` to ship it.

## Deploy

Import the repo at [vercel.com](https://vercel.com) and hit Deploy — it runs in
demo mode with **zero environment variables**. Add Supabase / Anthropic / Stripe
keys later (see `docs/deployment.md`) and set `NEXT_PUBLIC_DEMO_MODE=false` to go
live.
