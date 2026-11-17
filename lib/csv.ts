import type { SleepLog } from './types.ts'

export const CSV_COLUMNS: (keyof SleepLog)[] = [
  'sleep_date', 'tz', 'bedtime_at', 'wake_time_at', 'total_duration_minutes', 'sleep_latency', 'night_wakings',
  'co_sleep_occurred', 'co_sleep_start_at', 'co_sleep_end_at', 'co_sleep_minutes',
  'creatine_10g', 'creatine_timing', 'late_caffeine', 'late_meal', 'alcohol', 'late_screen_work',
  'room_too_warm', 'hard_workout', 'sick', 'sleep_quality', 'morning_energy', 'notes', 'created_at', 'updated_at',
]

function cell(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(logs: SleepLog[]): string {
  const rows = logs.map((l) => CSV_COLUMNS.map((c) => cell(l[c])).join(','))
  return [CSV_COLUMNS.join(','), ...rows].join('\n') + '\n'
}
