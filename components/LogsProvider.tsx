'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { SleepLog, SleepLogInput } from '@/lib/types'

interface LogsContextValue {
  logs: SleepLog[]
  childName: string
  /** Optimistic upsert. Resolves with the server row; rejects (and reverts) on failure. */
  save: (input: SleepLogInput) => Promise<SleepLog>
  /** Optimistic delete. Rejects (and reverts) on failure. */
  remove: (sleepDate: string) => Promise<void>
}

const LogsContext = createContext<LogsContextValue | null>(null)

const minutesBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 60000)

function optimisticRow(input: SleepLogInput, prev?: SleepLog): SleepLog {
  const now = new Date().toISOString()
  return {
    ...input,
    id: prev?.id ?? `pending-${input.sleep_date}`,
    total_duration_minutes: minutesBetween(input.bedtime_at, input.wake_time_at),
    co_sleep_minutes:
      input.co_sleep_start_at && input.co_sleep_end_at ? minutesBetween(input.co_sleep_start_at, input.co_sleep_end_at) : null,
    created_at: prev?.created_at ?? now,
    updated_at: now,
  }
}

function upsertSorted(logs: SleepLog[], row: SleepLog): SleepLog[] {
  return [...logs.filter((l) => l.sleep_date !== row.sleep_date), row].sort((a, b) =>
    a.sleep_date.localeCompare(b.sleep_date),
  )
}

async function errorFrom(res: Response): Promise<Error> {
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    window.location.href = '/login'
  }
  return new Error(data.error ?? `Request failed (${res.status})`)
}

export function LogsProvider({
  initial,
  childName,
  children,
}: {
  initial: SleepLog[]
  childName: string
  children: React.ReactNode
}) {
  const [logs, setLogsState] = useState(initial)
  // Ref mirrors state so async handlers read the current value synchronously
  const logsRef = useRef(initial)
  const setLogs = useCallback((next: SleepLog[]) => {
    logsRef.current = next
    setLogsState(next)
  }, [])

  const save = useCallback(
    async (input: SleepLogInput) => {
      const previous = logsRef.current.find((l) => l.sleep_date === input.sleep_date)
      setLogs(upsertSorted(logsRef.current, optimisticRow(input, previous)))
      try {
        const res = await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        if (!res.ok) throw await errorFrom(res)
        const row = (await res.json()) as SleepLog
        setLogs(upsertSorted(logsRef.current, row))
        return row
      } catch (e) {
        const without = logsRef.current.filter((l) => l.sleep_date !== input.sleep_date)
        setLogs(previous ? upsertSorted(without, previous) : without)
        throw e
      }
    },
    [setLogs],
  )

  const remove = useCallback(
    async (sleepDate: string) => {
      const previous = logsRef.current.find((l) => l.sleep_date === sleepDate)
      setLogs(logsRef.current.filter((l) => l.sleep_date !== sleepDate))
      try {
        const res = await fetch(`/api/logs?date=${sleepDate}`, { method: 'DELETE' })
        if (!res.ok) throw await errorFrom(res)
      } catch (e) {
        if (previous) setLogs(upsertSorted(logsRef.current, previous))
        throw e
      }
    },
    [setLogs],
  )

  return <LogsContext.Provider value={{ logs, childName, save, remove }}>{children}</LogsContext.Provider>
}

export function useLogs() {
  const ctx = useContext(LogsContext)
  if (!ctx) throw new Error('useLogs must be used inside LogsProvider')
  return ctx
}
