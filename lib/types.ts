export type SleepLatency = 'lt_15' | '15_30' | 'gt_30'
export type CreatineTiming = 'morning' | 'afternoon_evening'

export const FACTOR_KEYS = [
  'late_meal',
  'late_caffeine',
  'alcohol',
  'room_too_warm',
  'hard_workout',
  'sick',
] as const
export type FactorKey = (typeof FACTOR_KEYS)[number]

export const FACTOR_LABELS: Record<FactorKey, string> = {
  // Midnight Garden copy. Definitions (PRD §3): supper after 20:00, caffeine after 14:00, any alcohol
  late_meal: 'Late supper',
  late_caffeine: 'Afternoon coffee',
  alcohol: 'Wine',
  room_too_warm: 'Too warm',
  hard_workout: 'Hard workout',
  sick: 'Unwell',
}

export const LATENCY_LABELS: Record<SleepLatency, string> = {
  lt_15: '<15m',
  '15_30': '15–30m',
  gt_30: '>30m',
}

/** Row as stored in dormir.sleep_logs */
export interface SleepLog {
  id: string
  sleep_date: string // YYYY-MM-DD
  tz: string
  bedtime_at: string
  wake_time_at: string
  total_duration_minutes: number
  sleep_latency: SleepLatency | null
  night_wakings: number | null
  co_sleep_occurred: boolean
  co_sleep_start_at: string | null
  co_sleep_end_at: string | null
  co_sleep_minutes: number | null
  creatine_10g: boolean
  creatine_timing: CreatineTiming | null
  late_caffeine: boolean
  late_meal: boolean
  alcohol: boolean
  room_too_warm: boolean
  hard_workout: boolean
  sick: boolean
  sleep_quality: number | null
  morning_energy: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** Writable fields (generated/system columns excluded) */
export type SleepLogInput = Omit<
  SleepLog,
  'id' | 'total_duration_minutes' | 'co_sleep_minutes' | 'created_at' | 'updated_at'
>
