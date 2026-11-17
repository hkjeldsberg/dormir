// Timezone-aware wall-clock helpers. Pure, no deps (usable from node:test).

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

interface WallParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function wallParts(instant: Date, tz: string): WallParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Instant → local "YYYY-MM-DD" in tz */
export function localDate(instant: Date | string, tz: string): string {
  const p = wallParts(new Date(instant), tz)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** Instant → local "HH:MM" in tz */
export function localTime(instant: Date | string, tz: string): string {
  const p = wallParts(new Date(instant), tz)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

/** Local clock minutes since midnight (0–1439) */
export function localClockMinutes(instant: Date | string, tz: string): number {
  const p = wallParts(new Date(instant), tz)
  return p.hour * 60 + p.minute
}

/** Wall-clock "YYYY-MM-DD" + "HH:MM" in tz → UTC instant (handles DST via offset iteration). */
export function wallToInstant(date: string, time: string, tz: string): Date {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const target = Date.UTC(y, mo - 1, d, h, mi)
  let guess = target
  for (let i = 0; i < 3; i++) {
    const p = wallParts(new Date(guess), tz)
    const seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    const diff = target - seen
    if (diff === 0) break
    guess += diff
  }
  return new Date(guess)
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function daysBetween(a: string, b: string): number {
  const toMs = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toMs(b) - toMs(a)) / 86_400_000)
}

/**
 * Night-relative time: a clock time on the night ending on `sleepDate`.
 * Times ≥ 12:00 belong to the evening before; times < 12:00 to the morning of sleepDate.
 */
export function nightTimeToInstant(sleepDate: string, time: string, tz: string): Date {
  const hour = Number(time.split(':')[0])
  const day = hour >= 12 ? addDays(sleepDate, -1) : sleepDate
  return wallToInstant(day, time, tz)
}

/**
 * Clock minutes on a continuous night axis: evening times stay as-is,
 * after-midnight times get +24h (so 23:30 → 1410, 00:30 → 1470).
 */
export function nightAxisMinutes(clockMinutes: number): number {
  return clockMinutes < 12 * 60 ? clockMinutes + 24 * 60 : clockMinutes
}

export function formatNightAxis(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

export function roundToStep(clockMinutes: number, step: number): number {
  return (Math.round(clockMinutes / step) * step) % 1440
}

export function minutesToHHMM(clockMinutes: number): string {
  const m = ((clockMinutes % 1440) + 1440) % 1440
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

export function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h ${pad(m)}m`
}

export function median(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
