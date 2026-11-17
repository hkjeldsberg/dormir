import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addDays,
  localDate,
  localTime,
  nightAxisMinutes,
  nightTimeToInstant,
  wallToInstant,
} from './time.ts'
import { buildInput, defaultState, stateFromLog } from './form.ts'
import { compareGroups, computeInsights, consistencyBand, loadingStates, MIN_GROUP_N } from './insights.ts'
import { validateLogInput } from './validate.ts'
import { toCsv } from './csv.ts'
import type { SleepLog } from './types.ts'

const TZ = 'Atlantic/Canary'

// ---------- time ----------

test('wallToInstant round-trips across DST (Canary: WET/WEST)', () => {
  for (const [date, time] of [
    ['2026-01-15', '23:30'], // winter UTC+0
    ['2026-07-15', '23:30'], // summer UTC+1
    ['2026-03-29', '03:30'], // day after spring-forward
  ]) {
    const i = wallToInstant(date, time, TZ)
    assert.equal(localDate(i, TZ), date)
    assert.equal(localTime(i, TZ), time)
  }
  assert.equal(wallToInstant('2026-07-15', '23:30', TZ).toISOString(), '2026-07-15T22:30:00.000Z')
})

test('nightTimeToInstant puts evening times on the previous day', () => {
  assert.equal(localDate(nightTimeToInstant('2026-11-17', '23:15', TZ), TZ), '2026-11-16')
  assert.equal(localDate(nightTimeToInstant('2026-11-17', '00:30', TZ), TZ), '2026-11-17')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
})

test('nightAxisMinutes keeps after-midnight after evening', () => {
  assert.ok(nightAxisMinutes(30) > nightAxisMinutes(23 * 60 + 30))
})

// ---------- fixtures ----------

function makeLog(date: string, o: Partial<SleepLog> & { bed?: string; wake?: string } = {}): SleepLog {
  const bed = nightTimeToInstant(date, o.bed ?? '23:00', TZ).toISOString()
  const wake = wallToInstant(date, o.wake ?? '07:00', TZ).toISOString()
  const { bed: _b, wake: _w, ...rest } = o
  return {
    id: date,
    sleep_date: date,
    tz: TZ,
    bedtime_at: bed,
    wake_time_at: wake,
    total_duration_minutes: Math.round((Date.parse(wake) - Date.parse(bed)) / 60000),
    sleep_latency: null,
    night_wakings: 0,
    co_sleep_occurred: false,
    co_sleep_start_at: null,
    co_sleep_end_at: null,
    co_sleep_minutes: null,
    creatine_10g: true,
    creatine_timing: 'morning',
    late_caffeine: false,
    late_meal: false,
    alcohol: false,
    room_too_warm: false,
    hard_workout: false,
    sick: false,
    sleep_quality: 4,
    morning_energy: 4,
    notes: null,
    created_at: bed,
    updated_at: bed,
    ...rest,
  }
}

const series = (start: string, n: number, f: (i: number, date: string) => Partial<SleepLog> & { bed?: string } = () => ({})) =>
  Array.from({ length: n }, (_, i) => {
    const d = addDays(start, i)
    return makeLog(d, f(i, d))
  })

// ---------- form ----------

test('defaultState: median bedtime of last 7 handles midnight wrap; creatine sticky', () => {
  const logs = [
    makeLog('2026-11-14', { bed: '23:30' }),
    makeLog('2026-11-15', { bed: '00:30' }),
    makeLog('2026-11-16', { bed: '00:00', creatine_10g: true, creatine_timing: 'afternoon_evening' }),
  ]
  const s = defaultState('2026-11-17', logs, { isToday: false, now: new Date(), tz: TZ })
  assert.equal(s.bedtime, '00:00')
  assert.equal(s.creatine, true)
  assert.equal(s.creatineTiming, 'afternoon_evening')
  assert.equal(defaultState('2026-11-17', [], { isToday: false, now: new Date(), tz: TZ }).bedtime, '23:00')
})

test('defaultState: wake = now only before noon, else median wake', () => {
  const logs = ['2026-11-14', '2026-11-15', '2026-11-16'].map((d) => makeLog(d, { wake: '06:40' }))
  const morning = wallToInstant('2026-11-17', '06:52', TZ)
  const evening = wallToInstant('2026-11-17', '19:25', TZ)
  assert.equal(defaultState('2026-11-17', logs, { isToday: true, now: morning, tz: TZ }).wake, '06:50')
  assert.equal(defaultState('2026-11-17', logs, { isToday: true, now: evening, tz: TZ }).wake, '06:40')
  assert.equal(defaultState('2026-11-17', [], { isToday: true, now: evening, tz: TZ }).wake, '07:00')
})

test('buildInput: requires ratings and validates co-sleep window', () => {
  const base = defaultState('2026-11-17', [], { isToday: false, now: new Date(), tz: TZ })
  assert.equal(buildInput(base, '2026-11-17', TZ).ok, false)
  const rated = { ...base, quality: 3, energy: 2 }
  const ok = buildInput({ ...rated, coSleep: true, coStart: '02:30', coUntilMorning: true }, '2026-11-17', TZ)
  assert.ok(ok.ok)
  if (ok.ok) {
    assert.equal(ok.input.co_sleep_end_at, ok.input.wake_time_at)
    assert.equal(localDate(ok.input.bedtime_at, TZ), '2026-11-16')
    assert.equal(validateLogInput(ok.input).ok, true)
  }
  const early = buildInput({ ...rated, coSleep: true, coStart: '22:00' }, '2026-11-17', TZ)
  assert.equal(early.ok, false)
  const backwards = buildInput({ ...rated, coSleep: true, coStart: '03:00', coUntilMorning: false, coEnd: '02:00' }, '2026-11-17', TZ)
  assert.equal(backwards.ok, false)
})

test('stateFromLog → buildInput round-trips', () => {
  const log = makeLog('2026-11-17', {
    bed: '23:45',
    co_sleep_occurred: true,
    co_sleep_start_at: nightTimeToInstant('2026-11-17', '03:00', TZ).toISOString(),
    co_sleep_end_at: nightTimeToInstant('2026-11-17', '05:00', TZ).toISOString(),
    late_meal: true,
    notes: 'teething',
  })
  const s = stateFromLog(log)
  assert.equal(s.coUntilMorning, false)
  const r = buildInput(s, log.sleep_date, log.tz)
  assert.ok(r.ok)
  if (r.ok) {
    assert.equal(r.input.bedtime_at, log.bedtime_at)
    assert.equal(r.input.co_sleep_end_at, log.co_sleep_end_at)
    assert.equal(r.input.late_meal, true)
    assert.equal(r.input.notes, 'teething')
  }
})

// ---------- validate ----------

test('validateLogInput rejects bad payloads', () => {
  const good = buildInput({ ...defaultState('2026-11-17', [], { isToday: false, now: new Date(), tz: TZ }), quality: 3, energy: 3 }, '2026-11-17', TZ)
  assert.ok(good.ok)
  if (!good.ok) return
  const g = good.input
  assert.equal(validateLogInput({ ...g, tz: 'Mars/Base' }).ok, false)
  assert.equal(validateLogInput({ ...g, sleep_quality: 6 }).ok, false)
  assert.equal(validateLogInput({ ...g, creatine_10g: false, creatine_timing: 'morning' }).ok, false)
  assert.equal(validateLogInput({ ...g, co_sleep_start_at: g.bedtime_at }).ok, false)
  assert.equal(validateLogInput({ ...g, wake_time_at: g.bedtime_at }).ok, false)
  assert.equal(validateLogInput({ ...g, late_meal: 'yes' }).ok, false)
})

// ---------- insights ----------

test('compareGroups gates on min n and produces CI around true diff', () => {
  assert.equal(compareGroups([1, 2, 3, 4], [1, 2, 3, 4, 5]).ready, false)
  assert.equal(compareGroups([1, 2, 3, 4], [1, 2, 3, 4, 5]).need, 1)
  const c = compareGroups([4, 5, 4, 5, 4, 5], [2, 3, 2, 3, 2, 3])
  assert.ok(c.ready)
  assert.equal(c.diff, 2)
  assert.ok(c.ci![0] > 0 && c.ci![1] <= 3)
  // deterministic
  assert.deepEqual(compareGroups([1, 5, 2, 4, 3], [2, 2, 3, 3, 4]).ci, compareGroups([1, 5, 2, 4, 3], [2, 2, 3, 3, 4]).ci)
})

test('computeInsights: unlock threshold, sick exclusion, co-sleep effect detected', () => {
  assert.equal(computeInsights(series('2026-10-01', 13), { includeSick: false }).unlocked, false)

  const logs = series('2026-10-01', 30, (i, d) =>
    i % 3 === 0
      ? {
          co_sleep_occurred: true,
          co_sleep_start_at: nightTimeToInstant(d, '02:00', TZ).toISOString(),
          co_sleep_end_at: wallToInstant(d, '07:00', TZ).toISOString(),
          co_sleep_minutes: 300,
          sleep_quality: 2,
          morning_energy: 2,
          sick: i === 0,
        }
      : { sleep_quality: 4, morning_energy: 4 },
  )
  const ins = computeInsights(logs, { includeSick: false })
  assert.ok(ins.unlocked)
  assert.equal(ins.excludedSick, 1)
  const co = ins.factorCards.find((f) => f.key === 'co_sleep_occurred')!
  assert.ok(co.outcomes.sleep_quality.ready)
  assert.equal(co.outcomes.sleep_quality.diff, -2)
  assert.equal(ins.coSleep.buckets[2].n, 9) // ≥2h, sick night excluded
  assert.ok(ins.coSleep.longVsNone.morning_energy.ready)
  assert.equal(ins.creatine.streak, 30)
  assert.deepEqual(ins.creatine.adherence14, { taken: 14, logged: 14 })
})

test('loadingStates: continuous use → loaded after 14 days; history start not counted as unloaded', () => {
  const logs = series('2026-10-01', 20)
  const s = loadingStates(logs)
  assert.equal(s.get('2026-10-01'), 'transitional')
  assert.equal(s.get('2026-10-14'), 'loaded')
  const none = loadingStates(series('2026-10-01', 40, () => ({ creatine_10g: false, creatine_timing: null })))
  assert.equal(none.get('2026-10-20'), 'transitional') // 28-day window not yet within history
  assert.equal(none.get('2026-11-01'), 'unloaded')
})

test('consistency band + SD with midnight wrap', () => {
  assert.equal(consistencyBand(10), 'Excellent')
  assert.equal(consistencyBand(95), 'Irregular')
  const logs = series('2026-10-01', 14, (i) => ({ bed: i % 2 ? '23:30' : '00:30' }))
  const ins = computeInsights(logs, { includeSick: true })
  assert.ok(ins.consistency.sd14! > 25 && ins.consistency.sd14! < 35) // ~31m, not ~11h
})

test('MIN_GROUP_N is 5 per PRD', () => assert.equal(MIN_GROUP_N, 5))

test('csv escapes quotes/commas', () => {
  const csv = toCsv([makeLog('2026-11-17', { notes: 'bad, "dream"' })])
  assert.ok(csv.includes('"bad, ""dream"""'))
  assert.equal(csv.trim().split('\n').length, 2)
})

test('durationWords spells the hero line', async () => {
  const { durationWords } = await import('./words.ts')
  assert.equal(durationWords(490), 'eight hours & ten minutes')
  assert.equal(durationWords(60), 'one hour')
  assert.equal(durationWords(421), 'seven hours & one minute')
  assert.equal(durationWords(455), 'seven hours & thirty-five minutes')
})
