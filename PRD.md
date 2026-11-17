## Product Requirements Document: **Dormir** (Personal Sleep & Factor Correlation Tracker)

### 1. Product Overview & Objective

**Dormir** is a lightweight, high-craft personal web application built to log nightly sleep and correlate external/behavioral factors—specifically toddler co-sleeping disruptions, bedtime consistency, and high-dose creatine supplementation—against subjective sleep quality and morning energy.

Designed with a **mobile-first, iPhone 17 Pro viewport priority** (thumb-friendly bottom navigation, Dynamic Island safe-area awareness, haptic-style spring physics) while scaling cleanly to a desktop analytical view.

#### Success Metrics

* **Adherence:** ≥ 90% of nights logged over any rolling 30-day window.
* **Speed:** Median morning check-in completed in **< 15 seconds**.
* **Insight:** After 8 weeks, every Insight card for the core factors (co-sleep, creatine, bedtime consistency) has enough data to render (see §5B minimum-n rules).

#### Non-Goals (v1)

* Multi-user accounts, sharing, or social features.
* Native iOS app / direct HealthKit access (web cannot read HealthKit).
* Wearable/objective sleep data (no tracker worn at night).
* Push reminders / notifications.
* Offline write queue (see §5A — failures surface with retry instead).
* Medical claims or recommendations. Insights are descriptive personal statistics only.

---

### 2. Tech Stack & Architecture

* **Framework:** Next.js (App Router, TypeScript)
* **Styling & Motion:** Tailwind CSS, Motion. Design system **"Midnight Garden"** (source: `design/06 · Midnight Garden@2x.png`):
  * **Colors:** night `#0F1D17` (background), surface `#16291F` (arch/cards), line `#2F4A3A`, cream `#EDEFE6` (text/CTA), mist `#A9B8AE` (secondary), sage `#8FB89A` (selected/wordmark), moss `#5E7A68` (inactive), rose `#D9A6A0` (accent: toggle, tab underline, selected ring).
  * **Type:** EB Garamond (headings, row labels, italic wordmark `dormir`), Cormorant (old-style numerals for times/stats), Work Sans (UI labels/pills).
  * **Shapes:** arched hero card, leaf-cut pills and CTA (small corners with one long tip), outlined unselected controls.
  * **Ratings:** moon phases — new moon = 1 … full moon = 5; selected moon cream with rose ring.
  * **Charts/heatmap:** validated sage ordinal ramp for Rest 1→5 (`#3f6650 #548069 #6d9a81 #8fb89a #bcd8c3`), rose markers for visit nights.
  * **Copy:** garden voice — "Drifted off", "Woke in the night", "{child} came to visit", "What grew yesterday", Rest / Vigour, "Press the night into the book".
* **Backend & Database:** Supabase (PostgreSQL using dedicated schema `dormir`)
* **Data Access:** **Server-side only.** All reads/writes go through Server Actions / route handlers using the Supabase **service role key** (`SUPABASE_SERVICE_ROLE_KEY`, never exposed to the client). The browser never talks to Supabase directly and no Supabase key is shipped in the client bundle.
* **Authentication:** Single shared password from env (same pattern as other personal apps: `iron-session` + `proxy.ts`).
  * `APP_PASSWORD` — the one password.
  * `SESSION_SECRET` — ≥ 32-char secret used to seal the session cookie.
  * Login form posts to `/api/auth/login` → constant-time compare against `APP_PASSWORD` → sets a sealed, `HttpOnly`, `Secure`, `SameSite=Lax` cookie with a **1-year** expiry (zero friction at 6:30 AM).
  * `proxy.ts` verifies the cookie on every route except `/login`, `/api/auth/*` and static/PWA assets; invalid/missing → redirect to `/login` (pages) or `401` (API).
  * Changing `SESSION_SECRET` invalidates all sessions.
  * Basic brute-force protection: fixed 1s delay on failed login.
* **Configuration:** `CHILD_NAME` (display label for the co-sleeping child, e.g. "Sofia"). No personal names hardcoded in source.
* **Timezone:** Device-local. The browser's IANA timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`, currently `Atlantic/Canary`) is stored per log, so travel never corrupts history.
* **Deployment:** Vercel (PWA-ready with web app manifest + `apple-mobile-web-app-capable` meta tags so it can be added to the iPhone 17 Pro Home Screen as a native-feeling app)

---

### 3. Tracking Factors

All times are interpreted in the device's local timezone, stored per log in `tz`. `sleep_date` is the **local calendar date of the wake time** (the morning), computed on the device on save.

#### Core Requirements (MVP)

1. **Sleep Window:**
   * **Bedtime (`bedtime_at`):** Timestamp (defaults to 7-day rolling median bedtime; quick-adjust in 15-min increments or native iOS time wheel).
   * **Wake Time (`wake_time_at`):** Timestamp (one-tap "Just woke up" button or manual time picker).
   * *Auto-calculated:* Total Time in Bed (`total_duration_minutes`).
   * **Sleep Latency (`sleep_latency`):** Quick pills — `< 15 min` / `15–30 min` / `> 30 min`.
   * **Night Wakings (`night_wakings`):** Stepper `0`–`10` (count of times awake, including the child's arrival).

2. **Co-Sleeping / Child Intrusion (label from `DORMIR_CHILD_NAME`):**
   * **Did she come into bed? (`co_sleep_occurred`):** Boolean toggle.
   * **Arrival time (`co_sleep_start_at`):** Quick-select time — *crucial because a 1:00 AM intrusion disrupts deep slow-wave sleep differently than a 5:30 AM REM-heavy intrusion.*
   * **Until (`co_sleep_end_at`):** Defaults to wake time ("Stayed till morning"); custom time if she went back to her own bed.
   * *Auto-calculated:* Co-sleep duration (`co_sleep_minutes`).

3. **Creatine Protocol:**
   * **10g Creatine Taken (`creatine_10g`):** Boolean toggle. **Sticky default:** pre-filled from the previous day's log (habitual intake = zero taps).
   * **Timing (`creatine_timing`):** Optional tag — `Morning` / `Afternoon–Evening` (late high-dose creatine may affect sleep latency in some people).
   * Because creatine acts through **muscle/brain saturation over weeks**, the daily toggle is primarily an adherence log; analysis uses derived loading state (see §5B).

4. **Outcomes (dependent variables, `Y`):**
   * **Sleep Quality (`sleep_quality`):** 1–5 tactile rating.
   * **Morning Energy (`morning_energy`):** 1–5 tactile rating (specifically useful for testing whether creatine loading offsets sleep loss from co-sleeping).

#### Secondary Factors (Optional Quick-Tap Pills)

To keep morning logging under **15 seconds**, secondary factors are single-tap pill toggles, all defaulting to off:

* **Late supper (`late_meal`):** Dinner or a substantial meal after 20:00 (relevant on a later Spanish dinner schedule).
* **Afternoon coffee (`late_caffeine`):** Caffeine after 14:00.
* **Wine (`alcohol`):** Any alcohol (even 1–2 drinks measurably suppresses REM sleep).
* **Room Too Warm (`room_too_warm`):** Thermal disruption.
* **Hard Workout (`hard_workout`):** Intense training that day.
* **Unwell (`sick`):** You or the child unwell (major confounder—flagged nights can be excluded from Insights).
* **Notes (`notes`):** Optional 1-line text for anomalies (e.g., "bad dream", "teething").

---

### 4. Database Schema (`dormir`)

Expose the `dormir` schema in **Project Settings → API → Exposed schemas** (required for `supabase-js` with `db: { schema: 'dormir' }`). Security comes from **RLS enabled with no policies** + revoked `anon`/`authenticated` grants: only the server-side service role can access data.

```sql
create schema if not exists dormir;

-- Lock down: only service_role may touch the schema
revoke all on schema dormir from anon, authenticated;
grant usage on schema dormir to service_role;

create table dormir.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  sleep_date date not null unique, -- Local morning date (e.g., 2026-11-17); unique also provides the index
  tz text not null,                -- IANA timezone of the device when logged (e.g., 'Atlantic/Canary')

  -- Core Timing
  bedtime_at timestamptz not null,
  wake_time_at timestamptz not null,
  total_duration_minutes integer generated always as (
    (extract(epoch from (wake_time_at - bedtime_at)) / 60)::integer
  ) stored,
  sleep_latency text check (sleep_latency in ('lt_15', '15_30', 'gt_30')),
  night_wakings smallint check (night_wakings between 0 and 10),

  -- Child Co-Sleeping
  co_sleep_occurred boolean not null default false,
  co_sleep_start_at timestamptz,
  co_sleep_end_at timestamptz,
  co_sleep_minutes integer generated always as (
    (extract(epoch from (co_sleep_end_at - co_sleep_start_at)) / 60)::integer
  ) stored,

  -- Supplementation & Factors
  creatine_10g boolean not null default false,
  creatine_timing text check (creatine_timing in ('morning', 'afternoon_evening')),
  late_caffeine boolean not null default false,
  late_meal boolean not null default false,
  alcohol boolean not null default false,
  room_too_warm boolean not null default false,
  hard_workout boolean not null default false,
  sick boolean not null default false,

  -- Outcomes
  sleep_quality smallint check (sleep_quality between 1 and 5),
  morning_energy smallint check (morning_energy between 1 and 5),
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Integrity
  constraint wake_after_bed check (wake_time_at > bedtime_at),
  constraint co_sleep_fields_consistent check (
    co_sleep_occurred
    or (co_sleep_start_at is null and co_sleep_end_at is null)
  ),
  constraint co_sleep_times_required check (
    not co_sleep_occurred
    or (co_sleep_start_at is not null and co_sleep_end_at is not null)
  ),
  constraint co_sleep_within_night check (
    co_sleep_start_at is null
    or (co_sleep_start_at >= bedtime_at
        and co_sleep_end_at > co_sleep_start_at
        and co_sleep_end_at <= wake_time_at)
  ),
  constraint creatine_timing_requires_creatine check (
    creatine_10g or creatine_timing is null
  )
);

alter table dormir.sleep_logs enable row level security;
-- Intentionally no policies: anon/authenticated get nothing; service_role bypasses RLS.
grant select, insert, update, delete on dormir.sleep_logs to service_role;

-- Keep updated_at current
create or replace function dormir.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_sleep_logs_updated_at
before update on dormir.sleep_logs
for each row execute function dormir.set_updated_at();
```

Saving a night is an **upsert on `sleep_date`**, so re-submitting the same morning edits rather than duplicates.

---

### 5. User Experience & Screen Architecture

#### A. Mobile UX (iPhone 17 Pro Optimization)

* **Viewport & Safe Areas:** Respect `env(safe-area-inset-top)` (Dynamic Island) and `env(safe-area-inset-bottom)` (Home Indicator). All primary interactive controls live in the lower 60% of the screen for one-handed thumb reach.
* **Navigation:** Bottom tab bar — **Check-In** · **Insights** · **History**.
* **Screen 1: Morning Check-In (Default Home)**
  * **Smart Defaults:** `bedtime_at` = 7-day rolling median bedtime (fallback `23:00` until 3 nights exist); `wake_time_at` = current time rounded to nearest 5 min; `creatine_10g` = previous day's value. If today's log already exists, the screen opens it in edit mode.
  * **Missed Night Banner:** If yesterday's morning has no log, show a banner "Log yesterday?" that opens the form for that date (backfill). Dismissing (✕) is remembered per date on the device, so that date is never asked about again.
  * **Sleep Card:** Bedtime / wake time, latency pills, night-wakings stepper.
  * **Visit Card:** *"{CHILD_NAME} came to visit"* with a rose toggle; when on, a summary line ("at 02:00 · until morning") and an inline drawer (Motion `AnimatePresence`) revealing:
    * **Arrival** quick-pills: `23:00`, `00:00`, `01:00`, `02:00`, `03:00`, `04:00`, `05:00` + custom (15-min wheel).
    * **Until** pills: `Morning` (= wake time, default) + custom.
  * **"What grew yesterday" pills:** `Creatine 10g` (single pill, tap cycles off → morning → evening → off; sticky from yesterday), `Late supper`, `Afternoon coffee`, `Wine`, `Too warm`, `Hard workout`, `Unwell`.
  * **Outcome Rating:** moon-phase selectors (new moon = 1 … full moon = 5) for **Rest** (`sleep_quality`) and **Vigour** (`morning_energy`), both required to save.
  * **Primary CTA:** Full-width sticky leaf button ("Press the night into the book") with optimistic UI. On failure: revert state + message with **Retry** (form contents are preserved; no offline queue in v1).

#### B. Screen 2: Insights & Correlation Engine

Insights unlock after **14 logged nights**. Global rules for every card:

* Nights flagged `sick` are **excluded by default** (toggle to include).
* Each comparison shows **group sizes (`n`)**, the **mean difference**, and a **95% bootstrap confidence interval**.
* A card renders a result only when **each group has n ≥ 5**; otherwise it shows "Need X more nights with/without {factor}".
* Copy is descriptive ("associated with"), never causal—co-sleep nights may share confounders (illness, teething).

Cards:

* **Factor Impact Cards (Delta Analysis):** For each boolean factor, compare mean `sleep_quality`, `morning_energy`, and `total_duration_minutes` with vs. without the factor.
* **Co-Sleep Threshold:** Compare nights by `co_sleep_minutes` bucket: `none`, `< 120`, `≥ 120`; and by arrival time: before `03:00` vs. `03:00` or later.
* **Creatine (continuous protocol, no planned breaks):** Because creatine is taken daily with no off-blocks, a with/without comparison is not meaningful once saturated. Instead:
  * **Adherence:** % of nights with creatine over the last 14 / 30 days, plus current streak.
  * **Timing Effect:** `morning` vs. `afternoon_evening` dosing on `sleep_latency`, `sleep_quality`, and `morning_energy` — the one creatine variable that actually varies.
  * **Loading State (opportunistic):** *Loaded* = taken on ≥ 12 of the previous 14 days; *Unloaded* = ≤ 2 of the previous 28 days. Only renders if enough Unloaded nights exist (e.g., the first logged weeks before loading, or a lapse). Same n ≥ 5 gating.
  * **Creatine × Co-Sleep (hypothesis):** Among co-sleep nights, Loaded vs. Unloaded `morning_energy` — same opportunistic gating. *Framed as a personal hypothesis—small studies suggest creatine may blunt cognitive effects of sleep loss; evidence is limited.*
* **Bedtime Consistency Score:** Standard deviation of bedtime (minutes, computed on clock time with times after midnight treated as +24h) over the last 14 nights. Bands: `< 30 min` Excellent · `30–60` Good · `60–90` Fair · `> 90` Irregular. Also shown as a delta card: outcomes on nights within ±30 min of the median bedtime vs. outside.
* **Consistency & Sleep Debt Chart:** 14-day and 30-day rolling bar/line visualization showing bedtime, time in bed, and night wakings, with overlaid markers for co-sleeping nights.

#### C. Screen 3: History & Calendar Heatmap

* Compact monthly calendar grid color-coded by `sleep_quality` with small corner badges for co-sleep (moon/child icon) and `creatine_10g` (bolt icon). Unlogged days are visibly empty (tap to backfill).
* Tapping any day opens an edit sheet to retroactively fix, add notes, or delete (delete requires confirmation).
* **Export CSV** button: downloads all logs (all columns) for external analysis.

#### D. Desktop Web Adaptation (`≥ 1024px`)

* **Split-View Layout:** Left column (`380px` fixed) houses the Morning Check-In logger; right fluid workspace displays the 30-day multi-metric timeline, Insight cards, and an editable log table.

---

### 6. Implementation Phases

| Phase | Scope | Key Deliverables |
| --- | --- | --- |
| **Phase 1: Core & Schema** | Supabase setup + Next.js scaffold | Create `dormir.sleep_logs` with RLS + grants + trigger, expose schema, server-only Supabase client, env-password auth (signed cookie + middleware), mobile-first Morning Check-In with smart & sticky defaults, upsert save. |
| **Phase 2: History & Editing** | Log management + PWA polish | Calendar heatmap, edit/delete sheet, missed-night backfill banner, CSV export, iOS Home Screen manifest & icons. |
| **Phase 3: Correlation Engine** | Analytics & insights | Factor delta cards with n + bootstrap CI + minimum-n gating, co-sleep buckets, creatine loading state, bedtime consistency score, rolling charts, responsive desktop split-view. |

---

### 7. Decisions Log (2026-11-17)

1. **Timezone:** Device-local, stored per log (`tz`). Currently `Atlantic/Canary` (Tenerife).
2. **Objective sleep data:** No tracker worn → no wearable ingest.
3. **Reminders:** None.
4. **Creatine:** Continuous daily protocol, no planned breaks → Insights focus on adherence and dosing timing; loading-state comparisons are opportunistic only.
5. **Factor list:** As specified in §3 for now; revisit later.
