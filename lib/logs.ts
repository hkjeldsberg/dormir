import 'server-only'
import { db } from './supabase'
import type { SleepLog, SleepLogInput } from './types'

export async function listLogs(): Promise<SleepLog[]> {
  const { data, error } = await db().from('sleep_logs').select('*').order('sleep_date', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as SleepLog[]
}

export async function upsertLog(input: SleepLogInput): Promise<SleepLog> {
  const { data, error } = await db()
    .from('sleep_logs')
    .upsert(input, { onConflict: 'sleep_date' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as SleepLog
}

export async function deleteLog(sleepDate: string): Promise<void> {
  const { error } = await db().from('sleep_logs').delete().eq('sleep_date', sleepDate)
  if (error) throw new Error(error.message)
}
