// Check-in form state ↔ SleepLogInput. Pure (usable from node:test).
import { FACTOR_KEYS, type CreatineTiming, type FactorKey, type SleepLatency, type SleepLog, type SleepLogInput } from './types.ts'
import {
  localClockMinutes,
  localTime,
  median,
  minutesToHHMM,
  nightAxisMinutes,
  nightTimeToInstant,
  roundToStep,
  wallToInstant,
} from './time.ts'

export interface FormState {
  bedtime: string // HH:MM
  wake: string // HH:MM
  latency: SleepLatency | null
  wakings: number
  coSleep: boolean
  coStart: string // HH:MM
  coUntilMorning: boolean
  coEnd: string // HH:MM
  creatine: boolean
  creatineTiming: CreatineTiming | null
  factors: Record<FactorKey, boolean>
  quality: number | null
  energy: number | null
  notes: string
}

export const DEFAULT_BEDTIME = '23:00'
export const DEFAULT_WAKE = '07:00'
export const MAX_NIGHT_MS = 20 * 3600_000
export const ARRIVAL_PILLS = ['23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00']

const noFactors = () => Object.fromEntries(FACTOR_KEYS.map((k) => [k, false])) as Record<FactorKey, boolean>

export function stateFromLog(log: SleepLog): FormState {
  const tz = log.tz
  const coEnd = log.co_sleep_end_at ? localTime(log.co_sleep_end_at, tz) : '06:00'
  return {
    bedtime: localTime(log.bedtime_at, tz),
    wake: localTime(log.wake_time_at, tz),
    latency: log.sleep_latency,
    wakings: log.night_wakings ?? 0,
    coSleep: log.co_sleep_occurred,
    coStart: log.co_sleep_start_at ? localTime(log.co_sleep_start_at, tz) : '03:00',
    coUntilMorning: !log.co_sleep_end_at || Date.parse(log.co_sleep_end_at) === Date.parse(log.wake_time_at),
    coEnd,
    creatine: log.creatine_10g,
    creatineTiming: log.creatine_timing,
    factors: Object.fromEntries(FACTOR_KEYS.map((k) => [k, log[k]])) as Record<FactorKey, boolean>,
    quality: log.sleep_quality,
    energy: log.morning_energy,
    notes: log.notes ?? '',
  }
}

/** Smart defaults for a new log on `sleepDate`, given history. */
export function defaultState(sleepDate: string, logs: SleepLog[], opts: { isToday: boolean; now: Date; tz: string }): FormState {
  const before = logs.filter((l) => l.sleep_date < sleepDate).sort((a, b) => a.sleep_date.localeCompare(b.sleep_date))
  const recent = before.slice(-7)

  // 7-day rolling median bedtime (needs ≥ 3 nights), on the night axis so 23:30 & 00:30 average sensibly
  let bedtime = DEFAULT_BEDTIME
  if (recent.length >= 3) {
    const med = median(recent.map((l) => nightAxisMinutes(localClockMinutes(l.bedtime_at, l.tz))))!
    bedtime = minutesToHHMM(roundToStep(med, 5))
  }

  // Wake: "now" when logging this morning (before noon); otherwise the 7-day median wake time
  const nowMinutes = localClockMinutes(opts.now, opts.tz)
  let wake = DEFAULT_WAKE
  if (opts.isToday && nowMinutes < 12 * 60) {
    wake = minutesToHHMM(roundToStep(nowMinutes, 5))
  } else if (recent.length >= 3) {
    wake = minutesToHHMM(roundToStep(median(recent.map((l) => localClockMinutes(l.wake_time_at, l.tz)))!, 5))
  }

  // Sticky creatine: carry over the previous log
  const prev = before[before.length - 1]

  return {
    bedtime,
    wake,
    latency: null,
    wakings: 0,
    coSleep: false,
    coStart: '03:00',
    coUntilMorning: true,
    coEnd: '06:00',
    creatine: prev?.creatine_10g ?? false,
    creatineTiming: prev?.creatine_10g ? prev.creatine_timing : null,
    factors: noFactors(),
    quality: null,
    energy: null,
    notes: '',
  }
}

export type BuildResult = { ok: true; input: SleepLogInput } | { ok: false; error: string }

export function buildInput(state: FormState, sleepDate: string, tz: string): BuildResult {
  if (state.quality == null) return { ok: false, error: 'Rate sleep quality' }
  if (state.energy == null) return { ok: false, error: 'Rate morning energy' }

  const bed = nightTimeToInstant(sleepDate, state.bedtime, tz)
  const wake = wallToInstant(sleepDate, state.wake, tz)
  if (wake <= bed) return { ok: false, error: 'Wake time must be after bedtime' }
  if (wake.getTime() - bed.getTime() > MAX_NIGHT_MS) return { ok: false, error: 'Night longer than 20h — check times' }

  let coStart: Date | null = null
  let coEnd: Date | null = null
  if (state.coSleep) {
    coStart = nightTimeToInstant(sleepDate, state.coStart, tz)
    coEnd = state.coUntilMorning ? wake : nightTimeToInstant(sleepDate, state.coEnd, tz)
    if (coStart < bed) return { ok: false, error: 'Arrival is before bedtime' }
    if (coStart >= wake) return { ok: false, error: 'Arrival is after wake time' }
    if (coEnd <= coStart) return { ok: false, error: '“Until” must be after arrival' }
    if (coEnd > wake) return { ok: false, error: '“Until” is after wake time' }
  }

  return {
    ok: true,
    input: {
      sleep_date: sleepDate,
      tz,
      bedtime_at: bed.toISOString(),
      wake_time_at: wake.toISOString(),
      sleep_latency: state.latency,
      night_wakings: state.wakings,
      co_sleep_occurred: state.coSleep,
      co_sleep_start_at: coStart?.toISOString() ?? null,
      co_sleep_end_at: coEnd?.toISOString() ?? null,
      creatine_10g: state.creatine,
      creatine_timing: state.creatine ? state.creatineTiming : null,
      ...state.factors,
      sleep_quality: state.quality,
      morning_energy: state.energy,
      notes: state.notes.trim() || null,
    },
  }
}
