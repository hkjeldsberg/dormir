# Dormir — Build Log

## Phase 1: Core & Schema
- [x] `supabase/migrations/0001_init.sql` — schema, RLS (no policies), grants, updated_at trigger, integrity constraints
- [x] Server-only Supabase client (service role), `/api/logs` GET/POST(upsert)/DELETE
- [x] Single env password auth: iron-session sealed cookie (1y), `proxy.ts` guard, 1s delay on bad password
- [x] Mobile-first Check-In: smart defaults (7-day median bedtime/wake), sticky creatine, co-sleep drawer, latency, wakings, factors, ratings, optimistic save + retry
- [x] Device-local timezone stored per log (`tz`)

## Phase 2: History & Editing
- [x] Calendar heatmap (validated quality ramp) + co-sleep/creatine badges
- [x] Edit sheet (reuses form) + confirm-delete
- [x] Missed-night backfill banner
- [x] CSV export (`/api/export`)
- [x] PWA manifest, SVG icon, generated apple-touch icon

## Phase 3: Correlation Engine
- [x] Factor deltas with n, 95% bootstrap CI, min n ≥ 5 gating, unlock at 14 nights, sick exclusion toggle
- [x] Co-sleep buckets + arrival before/after 03:00
- [x] Creatine adherence/streak, AM vs PM timing, opportunistic loading state
- [x] Bedtime consistency SD + band, on/off-schedule deltas
- [x] Time-in-bed + bedtime charts (14/30d, hover tooltips)
- [x] Desktop split view (logger left, overview/insights/history right)

## Review (2026-11-17)
- `npm test`: 14/14 pass (time/DST, form round-trip, validation, stats, loading state, CSV)
- `tsc` clean, `next build` clean
- Migration run on local Postgres 14: generated columns, trigger, all 4 constraints, anon denied
- E2E in Chrome (mobile 402px + desktop 1440px) against in-memory PostgREST mock: login, redirect/401, save, validation, edit, delete, insights, history, tooltips; no console errors
- Fixed during testing: evening wake default (now only before noon), client 20h cap, opaque alert

## Setup (to do by user)
1. Supabase SQL editor → run `supabase/migrations/0001_init.sql`
2. Project Settings → API → Exposed schemas → add `dormir`
3. `.env.local` from `.env.example` (APP_PASSWORD, SESSION_SECRET via `openssl rand -base64 48`, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CHILD_NAME)
4. `npm run dev` → Vercel: same env vars

## Midnight Garden redesign (2026-11-17)
- [x] Tokens sampled from `design/06 · Midnight Garden@2x.png`; EB Garamond + Cormorant (old-style numerals) + Work Sans
- [x] Check-in: arch hero with flower, spelled-out duration, leaf pills, visit card, creatine cycle pill, moon ratings, leaf CTA
- [x] Shell (serif tabs, rose underline), login, edit sheet, insights, history, overview restyled; emoji badges → dots
- [x] Chart/heatmap ramp re-validated on #16291F (sage, 5 steps, all checks pass)
- [x] Icons redrawn (flower in arch)
- Verified: 15/15 tests, tsc, build, browser at 402px (iframe) + 1280px, save round-trip, no console errors
- Lesson: Google-hosted EB Garamond subset lacks `onum`; Tailwind `font-*` utilities override component-layer classes
