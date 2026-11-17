'use client'

import { useMemo, useState } from 'react'
import { useLogs } from './LogsProvider'
import { useToday } from './useToday'
import { EditSheet } from './EditSheet'
import { QUALITY_RAMP } from './Charts'
import type { SleepLog } from '@/lib/types'
import { formatDuration, localTime } from '@/lib/time'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1))
  const lead = (first.getUTCDay() + 6) % 7 // Monday-first
  const daysIn = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells: (string | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= daysIn; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  while (cells.length % 7) cells.push(null)
  return cells
}

export function HistoryView() {
  const { logs } = useLogs()
  const today = useToday()
  const [offset, setOffset] = useState(0)
  const [editing, setEditing] = useState<string | null>(null)
  const byDate = useMemo(() => new Map(logs.map((l) => [l.sleep_date, l])), [logs])

  if (!today) return <div className="h-96 animate-pulse rounded-2xl bg-ink-card" aria-busy />

  const [ty, tm] = today.split('-').map(Number)
  const view = new Date(Date.UTC(ty, tm - 1 + offset, 1))
  const year = view.getUTCFullYear()
  const month = view.getUTCMonth()
  const cells = monthGrid(year, month)
  const monthLabel = view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const monthLogs = logs.filter((l) => l.sleep_date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).reverse()

  return (
    <div className="space-y-3">
      <header className="flex items-end justify-between">
        <h1 className="text-[28px] font-bold tracking-tight">History</h1>
        <a href="/api/export" className="rounded-full bg-ink-raised px-4 py-2 text-sm font-medium" download>
          Export CSV
        </a>
      </header>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => setOffset((o) => o - 1)} className="h-10 w-10 rounded-full bg-ink-raised">
            ‹
          </button>
          <h2 className="text-[17px] font-semibold">{monthLabel}</h2>
          <button
            type="button"
            aria-label="Next month"
            disabled={offset >= 0}
            onClick={() => setOffset((o) => o + 1)}
            className="h-10 w-10 rounded-full bg-ink-raised disabled:opacity-30"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="pb-1 text-xs font-medium text-label-muted">
              {d}
            </div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={i} />
            const log = byDate.get(date)
            const future = date > today
            const q = log?.sleep_quality
            return (
              <button
                key={date}
                type="button"
                disabled={future}
                onClick={() => setEditing(date)}
                aria-label={`${date}${log ? `, quality ${q ?? 'unrated'}` : ', not logged'}`}
                className={`relative aspect-square rounded-lg text-sm font-medium tabular-nums disabled:opacity-20 ${
                  log ? '' : 'ring-1 ring-inset ring-ink-line'
                } ${date === today ? 'outline outline-2 outline-amber' : ''}`}
                style={log ? { background: q ? QUALITY_RAMP[q - 1] : '#48484A', color: q && q >= 4 ? '#000' : '#fff' } : undefined}
              >
                {Number(date.slice(8))}
                {log?.co_sleep_occurred && <span className="absolute left-0.5 top-0 text-[9px]" aria-hidden>🧸</span>}
                {log?.creatine_10g && <span className="absolute bottom-0 right-0.5 text-[9px]" aria-hidden>⚡︎</span>}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-label-secondary">
          <span className="flex items-center gap-1">
            Quality
            {QUALITY_RAMP.map((c, i) => (
              <span key={c} className="flex items-center gap-0.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
                <span className="text-label-muted">{i + 1}</span>
              </span>
            ))}
          </span>
          <span>🧸 co-sleep</span>
          <span>⚡︎ creatine</span>
        </div>
      </section>

      <LogList logs={monthLogs} onSelect={setEditing} />
      <EditSheet date={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

export function LogList({ logs, onSelect }: { logs: SleepLog[]; onSelect: (date: string) => void }) {
  if (!logs.length) return <p className="py-6 text-center text-sm text-label-muted">No nights logged.</p>
  return (
    <ul className="divide-y divide-ink-line overflow-hidden rounded-2xl bg-ink-card">
      {logs.map((l) => (
        <li key={l.sleep_date}>
          <button type="button" onClick={() => onSelect(l.sleep_date)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-ink-raised">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: l.sleep_quality ? QUALITY_RAMP[l.sleep_quality - 1] : '#48484A', color: (l.sleep_quality ?? 0) >= 4 ? '#000' : '#fff' }}
              aria-label={`Quality ${l.sleep_quality ?? 'unrated'}`}
            >
              {l.sleep_quality ?? '–'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{l.sleep_date}</span>
              <span className="block truncate text-xs text-label-muted">
                {localTime(l.bedtime_at, l.tz)}–{localTime(l.wake_time_at, l.tz)} · {formatDuration(l.total_duration_minutes)} · energy {l.morning_energy ?? '–'}
                {l.notes ? ` · ${l.notes}` : ''}
              </span>
            </span>
            <span className="shrink-0 text-xs" aria-hidden>
              {l.co_sleep_occurred && '🧸'}
              {l.creatine_10g && '⚡︎'}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
