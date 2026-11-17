-- Dormir: initial schema
-- After running: Project Settings → API → Exposed schemas → add `dormir`.

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
  late_screen_work boolean not null default false,
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
revoke all on dormir.sleep_logs from anon, authenticated;
grant select, insert, update, delete on dormir.sleep_logs to service_role;

-- Keep updated_at current
create or replace function dormir.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_sleep_logs_updated_at
before update on dormir.sleep_logs
for each row execute function dormir.set_updated_at();
