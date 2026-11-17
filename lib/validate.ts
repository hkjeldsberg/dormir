// Server-side payload validation for sleep log upserts. DB constraints are the final guard.
import type { SleepLogInput } from './types.ts'
import { isValidTimeZone } from './time.ts'
import { MAX_NIGHT_MS } from './form.ts'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const BOOL_KEYS = [
  'co_sleep_occurred',
  'creatine_10g',
  'late_caffeine',
  'late_meal',
  'alcohol',
  'room_too_warm',
  'hard_workout',
  'sick',
] as const

export type ValidationResult = { ok: true; value: SleepLogInput } | { ok: false; error: string }

function isIso(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v))
}

function intInRange(v: unknown, lo: number, hi: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi
}

export function validateLogInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be an object' }
  const b = body as Record<string, unknown>

  if (typeof b.sleep_date !== 'string' || !DATE_RE.test(b.sleep_date)) return { ok: false, error: 'Invalid sleep_date' }
  if (typeof b.tz !== 'string' || !isValidTimeZone(b.tz)) return { ok: false, error: 'Invalid tz' }
  if (!isIso(b.bedtime_at) || !isIso(b.wake_time_at)) return { ok: false, error: 'Invalid bedtime/wake time' }
  if (Date.parse(b.wake_time_at) <= Date.parse(b.bedtime_at)) return { ok: false, error: 'Wake time must be after bedtime' }
  if (Date.parse(b.wake_time_at) - Date.parse(b.bedtime_at) > MAX_NIGHT_MS)
    return { ok: false, error: 'Night longer than 20h — check times' }

  for (const k of BOOL_KEYS) if (typeof b[k] !== 'boolean') return { ok: false, error: `Invalid ${k}` }

  if (b.sleep_latency != null && !['lt_15', '15_30', 'gt_30'].includes(b.sleep_latency as string))
    return { ok: false, error: 'Invalid sleep_latency' }
  if (b.night_wakings != null && !intInRange(b.night_wakings, 0, 10)) return { ok: false, error: 'Invalid night_wakings' }
  if (!intInRange(b.sleep_quality, 1, 5)) return { ok: false, error: 'Sleep quality (1–5) required' }
  if (!intInRange(b.morning_energy, 1, 5)) return { ok: false, error: 'Morning energy (1–5) required' }

  if (b.creatine_timing != null) {
    if (!['morning', 'afternoon_evening'].includes(b.creatine_timing as string)) return { ok: false, error: 'Invalid creatine_timing' }
    if (!b.creatine_10g) return { ok: false, error: 'Creatine timing requires creatine' }
  }

  if (b.co_sleep_occurred) {
    if (!isIso(b.co_sleep_start_at) || !isIso(b.co_sleep_end_at)) return { ok: false, error: 'Co-sleep times required' }
    const s = Date.parse(b.co_sleep_start_at)
    const e = Date.parse(b.co_sleep_end_at)
    if (s < Date.parse(b.bedtime_at) || e <= s || e > Date.parse(b.wake_time_at))
      return { ok: false, error: 'Co-sleep must fall within the night' }
  } else if (b.co_sleep_start_at != null || b.co_sleep_end_at != null) {
    return { ok: false, error: 'Co-sleep times set without co-sleep' }
  }

  if (b.notes != null && (typeof b.notes !== 'string' || b.notes.length > 280)) return { ok: false, error: 'Notes max 280 chars' }

  const value: SleepLogInput = {
    sleep_date: b.sleep_date,
    tz: b.tz,
    bedtime_at: new Date(b.bedtime_at).toISOString(),
    wake_time_at: new Date(b.wake_time_at).toISOString(),
    sleep_latency: (b.sleep_latency as SleepLogInput['sleep_latency']) ?? null,
    night_wakings: (b.night_wakings as number | null) ?? null,
    co_sleep_occurred: b.co_sleep_occurred as boolean,
    co_sleep_start_at: b.co_sleep_occurred ? new Date(b.co_sleep_start_at as string).toISOString() : null,
    co_sleep_end_at: b.co_sleep_occurred ? new Date(b.co_sleep_end_at as string).toISOString() : null,
    creatine_10g: b.creatine_10g as boolean,
    creatine_timing: (b.creatine_timing as SleepLogInput['creatine_timing']) ?? null,
    late_caffeine: b.late_caffeine as boolean,
    late_meal: b.late_meal as boolean,
    alcohol: b.alcohol as boolean,
    room_too_warm: b.room_too_warm as boolean,
    hard_workout: b.hard_workout as boolean,
    sick: b.sick as boolean,
    sleep_quality: b.sleep_quality as number,
    morning_energy: b.morning_energy as number,
    notes: typeof b.notes === 'string' && b.notes.trim() ? b.notes.trim() : null,
  }
  return { ok: true, value }
}
