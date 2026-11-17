// Insight computations. Pure functions over SleepLog[] — no I/O, deterministic.
import { FACTOR_KEYS, FACTOR_LABELS, type FactorKey, type SleepLog } from './types.ts'
import { addDays, daysBetween, localClockMinutes, median, nightAxisMinutes } from './time.ts'

export const UNLOCK_NIGHTS = 14
export const MIN_GROUP_N = 5
const BOOTSTRAP_ITERATIONS = 2000

export type OutcomeKey = 'sleep_quality' | 'morning_energy' | 'total_duration_minutes'
export const OUTCOMES: { key: OutcomeKey; label: string; unit: 'score' | 'minutes' }[] = [
  { key: 'sleep_quality', label: 'Sleep quality', unit: 'score' },
  { key: 'morning_energy', label: 'Morning energy', unit: 'score' },
  { key: 'total_duration_minutes', label: 'Time in bed', unit: 'minutes' },
]

export interface Comparison {
  nA: number
  nB: number
  meanA: number | null
  meanB: number | null
  /** meanA − meanB */
  diff: number | null
  /** 95% bootstrap CI of diff */
  ci: [number, number] | null
  ready: boolean
  /** Nights still needed in the smaller group to reach MIN_GROUP_N */
  need: number
}

// ---------- stats primitives ----------

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null
}

export function stdDev(xs: number[]): number | null {
  if (xs.length < 2) return null
  const m = mean(xs)!
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}

function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

export function compareGroups(a: number[], b: number[], seed = 42): Comparison {
  const nA = a.length
  const nB = b.length
  const meanA = mean(a)
  const meanB = mean(b)
  const ready = nA >= MIN_GROUP_N && nB >= MIN_GROUP_N
  const need = Math.max(0, MIN_GROUP_N - Math.min(nA, nB))
  if (!ready || meanA == null || meanB == null) {
    return { nA, nB, meanA, meanB, diff: null, ci: null, ready: false, need }
  }
  const rand = mulberry32(seed)
  const diffs: number[] = new Array(BOOTSTRAP_ITERATIONS)
  for (let i = 0; i < BOOTSTRAP_ITERATIONS; i++) {
    let sa = 0
    let sb = 0
    for (let j = 0; j < nA; j++) sa += a[Math.floor(rand() * nA)]
    for (let j = 0; j < nB; j++) sb += b[Math.floor(rand() * nB)]
    diffs[i] = sa / nA - sb / nB
  }
  diffs.sort((x, y) => x - y)
  return {
    nA,
    nB,
    meanA,
    meanB,
    diff: meanA - meanB,
    ci: [percentile(diffs, 0.025), percentile(diffs, 0.975)],
    ready: true,
    need: 0,
  }
}

function values(logs: SleepLog[], key: OutcomeKey): number[] {
  return logs.map((l) => l[key]).filter((v): v is number => v != null)
}

function compareOutcomes(a: SleepLog[], b: SleepLog[]): Record<OutcomeKey, Comparison> {
  return {
    sleep_quality: compareGroups(values(a, 'sleep_quality'), values(b, 'sleep_quality')),
    morning_energy: compareGroups(values(a, 'morning_energy'), values(b, 'morning_energy')),
    total_duration_minutes: compareGroups(values(a, 'total_duration_minutes'), values(b, 'total_duration_minutes')),
  }
}

// ---------- derived per-night values ----------

export function bedtimeAxis(log: SleepLog): number {
  return nightAxisMinutes(localClockMinutes(log.bedtime_at, log.tz))
}

const LATENCY_SCORE = { lt_15: 1, '15_30': 2, gt_30: 3 } as const

export type LoadingState = 'loaded' | 'unloaded' | 'transitional'

/**
 * Creatine loading state for each night, from adherence over prior days.
 * Loaded: taken on ≥ 12/14 of window. Unloaded: ≤ 2/28. Requires the window to lie
 * within tracked history and ≥ 80% of its days to be logged (missing ≠ not taken).
 */
export function loadingStates(logs: SleepLog[]): Map<string, LoadingState> {
  const byDate = new Map(logs.map((l) => [l.sleep_date, l]))
  const first = logs.reduce<string | null>((m, l) => (m == null || l.sleep_date < m ? l.sleep_date : m), null)
  const out = new Map<string, LoadingState>()
  if (!first) return out

  const windowFrac = (date: string, days: number): number | null => {
    const start = addDays(date, -(days - 1))
    if (start < first) return null
    let logged = 0
    let taken = 0
    for (let i = 0; i < days; i++) {
      const l = byDate.get(addDays(start, i))
      if (!l) continue
      logged++
      if (l.creatine_10g) taken++
    }
    if (logged < Math.ceil(days * 0.8)) return null
    return taken / logged
  }

  for (const l of logs) {
    const f14 = windowFrac(l.sleep_date, 14)
    const f28 = windowFrac(l.sleep_date, 28)
    if (f14 != null && f14 >= 12 / 14) out.set(l.sleep_date, 'loaded')
    else if (f28 != null && f28 <= 2 / 28) out.set(l.sleep_date, 'unloaded')
    else out.set(l.sleep_date, 'transitional')
  }
  return out
}

// ---------- consistency ----------

export type ConsistencyBand = 'Excellent' | 'Good' | 'Fair' | 'Irregular'

export function consistencyBand(sdMinutes: number): ConsistencyBand {
  if (sdMinutes < 30) return 'Excellent'
  if (sdMinutes < 60) return 'Good'
  if (sdMinutes < 90) return 'Fair'
  return 'Irregular'
}

// ---------- main ----------

export interface FactorCard {
  key: FactorKey | 'co_sleep_occurred'
  label: string
  outcomes: Record<OutcomeKey, Comparison>
}

export interface GroupSummary {
  label: string
  n: number
  quality: number | null
  energy: number | null
  duration: number | null
}

export interface ChartPoint {
  date: string
  tib: number
  bedtime: number // night-axis minutes
  quality: number | null
  energy: number | null
  wakings: number | null
  coSleep: boolean
  coSleepMinutes: number | null
}

export interface Insights {
  totalNights: number
  unlocked: boolean
  analysedNights: number
  excludedSick: number
  factorCards: FactorCard[]
  coSleep: {
    buckets: GroupSummary[]
    shortVsNone: Record<OutcomeKey, Comparison>
    longVsNone: Record<OutcomeKey, Comparison>
    earlyVsLate: Record<OutcomeKey, Comparison>
  }
  creatine: {
    adherence14: { taken: number; logged: number } | null
    adherence30: { taken: number; logged: number } | null
    streak: number
    timing: {
      latency: Comparison
      quality: Comparison
      energy: Comparison
    }
    loadedVsUnloaded: Record<OutcomeKey, Comparison>
    coSleepEnergyLoadedVsUnloaded: Comparison
  }
  consistency: {
    sd14: number | null
    band: ConsistencyBand | null
    medianBedtime: number | null
    onScheduleVsOff: Record<OutcomeKey, Comparison>
  }
  series: ChartPoint[]
}

function summarize(label: string, logs: SleepLog[]): GroupSummary {
  return {
    label,
    n: logs.length,
    quality: mean(values(logs, 'sleep_quality')),
    energy: mean(values(logs, 'morning_energy')),
    duration: mean(values(logs, 'total_duration_minutes')),
  }
}

function adherence(sorted: SleepLog[], days: number) {
  if (!sorted.length) return null
  const last = sorted[sorted.length - 1].sleep_date
  const start = addDays(last, -(days - 1))
  const win = sorted.filter((l) => l.sleep_date >= start)
  return { taken: win.filter((l) => l.creatine_10g).length, logged: win.length }
}

function streak(sorted: SleepLog[]): number {
  let n = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    const l = sorted[i]
    if (i < sorted.length - 1 && daysBetween(l.sleep_date, sorted[i + 1].sleep_date) !== 1) break
    if (!l.creatine_10g) break
    n++
  }
  return n
}

export function computeInsights(allLogs: SleepLog[], opts: { includeSick: boolean }): Insights {
  const sortedAll = [...allLogs].sort((a, b) => a.sleep_date.localeCompare(b.sleep_date))
  const logs = opts.includeSick ? sortedAll : sortedAll.filter((l) => !l.sick)

  // Factor cards (with vs without)
  const factorKeys: (FactorKey | 'co_sleep_occurred')[] = [
    'co_sleep_occurred',
    ...FACTOR_KEYS.filter((k) => k !== 'sick'),
  ]
  if (opts.includeSick) factorKeys.push('sick')
  const factorCards: FactorCard[] = factorKeys.map((key) => ({
    key,
    label: key === 'co_sleep_occurred' ? 'Co-sleep' : FACTOR_LABELS[key],
    outcomes: compareOutcomes(
      logs.filter((l) => l[key]),
      logs.filter((l) => !l[key]),
    ),
  }))

  // Co-sleep buckets
  const none = logs.filter((l) => !l.co_sleep_occurred)
  const co = logs.filter((l) => l.co_sleep_occurred)
  const short = co.filter((l) => (l.co_sleep_minutes ?? 0) < 120)
  const long = co.filter((l) => (l.co_sleep_minutes ?? 0) >= 120)
  const arrivalAxis = (l: SleepLog) => nightAxisMinutes(localClockMinutes(l.co_sleep_start_at!, l.tz))
  const early = co.filter((l) => l.co_sleep_start_at && arrivalAxis(l) < 27 * 60) // before 03:00
  const late = co.filter((l) => l.co_sleep_start_at && arrivalAxis(l) >= 27 * 60)

  // Creatine
  const states = loadingStates(sortedAll)
  const loaded = logs.filter((l) => states.get(l.sleep_date) === 'loaded')
  const unloaded = logs.filter((l) => states.get(l.sleep_date) === 'unloaded')
  const morning = logs.filter((l) => l.creatine_10g && l.creatine_timing === 'morning')
  const later = logs.filter((l) => l.creatine_10g && l.creatine_timing === 'afternoon_evening')
  const latencyVals = (ls: SleepLog[]) =>
    ls.map((l) => (l.sleep_latency ? LATENCY_SCORE[l.sleep_latency] : null)).filter((v): v is 1 | 2 | 3 => v != null)

  // Consistency
  const last14 = sortedAll.slice(-14).map(bedtimeAxis)
  const sd14 = last14.length >= 3 ? stdDev(last14) : null
  const medianBed = median(logs.map(bedtimeAxis))
  const onSched = medianBed == null ? [] : logs.filter((l) => Math.abs(bedtimeAxis(l) - medianBed) <= 30)
  const offSched = medianBed == null ? [] : logs.filter((l) => Math.abs(bedtimeAxis(l) - medianBed) > 30)

  return {
    totalNights: sortedAll.length,
    unlocked: sortedAll.length >= UNLOCK_NIGHTS,
    analysedNights: logs.length,
    excludedSick: sortedAll.length - logs.length,
    factorCards,
    coSleep: {
      buckets: [summarize('None', none), summarize('< 2h', short), summarize('≥ 2h', long)],
      shortVsNone: compareOutcomes(short, none),
      longVsNone: compareOutcomes(long, none),
      earlyVsLate: compareOutcomes(early, late),
    },
    creatine: {
      adherence14: adherence(sortedAll, 14),
      adherence30: adherence(sortedAll, 30),
      streak: streak(sortedAll),
      timing: {
        latency: compareGroups(latencyVals(morning), latencyVals(later)),
        quality: compareGroups(values(morning, 'sleep_quality'), values(later, 'sleep_quality')),
        energy: compareGroups(values(morning, 'morning_energy'), values(later, 'morning_energy')),
      },
      loadedVsUnloaded: compareOutcomes(loaded, unloaded),
      coSleepEnergyLoadedVsUnloaded: compareGroups(
        values(loaded.filter((l) => l.co_sleep_occurred), 'morning_energy'),
        values(unloaded.filter((l) => l.co_sleep_occurred), 'morning_energy'),
      ),
    },
    consistency: {
      sd14,
      band: sd14 == null ? null : consistencyBand(sd14),
      medianBedtime: medianBed,
      onScheduleVsOff: compareOutcomes(onSched, offSched),
    },
    series: sortedAll.map((l) => ({
      date: l.sleep_date,
      tib: l.total_duration_minutes,
      bedtime: bedtimeAxis(l),
      quality: l.sleep_quality,
      energy: l.morning_energy,
      wakings: l.night_wakings,
      coSleep: l.co_sleep_occurred,
      coSleepMinutes: l.co_sleep_minutes,
    })),
  }
}
