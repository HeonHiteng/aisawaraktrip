# Deployment

## Vercel (recommended)

1. Push to GitHub (done: `HeonHiteng/aisawaraktrip`).
2. vercel.com → **Add New → Project** → import the repo. Framework auto-detects
   as Next.js. No build settings to change.
3. **Deploy.** With zero environment variables the app runs in **demo mode** —
   fully clickable on fixture data. Good for sharing a preview.
4. Add env vars (Project → Settings → Environment Variables) as you turn on real
   backends, then redeploy. See the checklist below.

Node is pinned to 22.x via `package.json` `engines`.

## Environment variable checklist

| Variable | When | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | first real deploy | e.g. `https://aisawaraktrip.vercel.app` or your domain. Used for OG tags, sitemap, auth redirects. |
| `NEXT_PUBLIC_DEMO_MODE` | to go live | set `false` once Supabase is configured (otherwise demo mode stays on) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Phase 2 | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Phase 2 | **server-only**; used by webhooks / admin / seeding |
| `ANTHROPIC_API_KEY` | Phase 4 | enables the real Claude planner (falls back to the deterministic builder without it) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Phase 3 | map pins on detail pages |
| `PAYMENT_PROVIDER` | Phase 7 | `mock` (default) → `stripe` → `billplz` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Phase 7 | test mode first |
| `RESEND_API_KEY` / `EMAIL_FROM` | Phase 7 | booking confirmation emails (logs to console without it) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Phase 9 | distributed rate limiting (in-process fallback works for a single instance) |
| `NEXT_PUBLIC_SENTRY_DSN` | optional | error reporting |

Never put a non-`NEXT_PUBLIC_` value in client code.

## Supabase (production)

1. Create a project (region **Singapore**).
2. Apply the schema: `npx supabase link --project-ref <ref>` then `npm run db:push`,
   then paste `supabase/seed.sql` into the SQL Editor.
3. Run `supabase/rls-check.sql` in the SQL Editor — every public table must show
   `rls_enabled = true` and have at least one policy.
4. `npm run gen:types` and commit `types/database.ts`.
5. Auth → URL Configuration: set **Site URL** to your production URL and add
   `<url>/**` to redirect URLs. Enable **Anonymous sign-ins** for guest access.
6. Auth → Providers → Email: decide on email confirmation (off = faster; on =
   the app already handles the "check your email" flow).

## Payments (production)

The `mock` provider ships working. For real money you need a registered business
(SSM) + bank account + gateway approval — this is outside the deploy step. Until
then, keep `PAYMENT_PROVIDER=mock` or use Stripe **test mode**.

## Post-deploy smoke test

- `GET /api/health` returns `{"status":"ok"}`
- `/` renders; "Plan a trip" → login → **Continue as guest** → app loads
- `/manifest.webmanifest` and `/icon` load; the app is installable (Chrome →
  Install)
- `npm run test:e2e` still passes against the deployed URL:
  `npx playwright test --config playwright.config.ts` with `baseURL` overridden.

## Legal before a public launch

- Replace the contact emails in `/privacy` and `/terms`.
- Register the business (SSM) and add a real PDPA data-protection contact.
- Confirm whether reselling tours needs a MOTAC travel-agency licence for your
  commission model.
