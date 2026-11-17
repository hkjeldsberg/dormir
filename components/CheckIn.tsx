'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckInForm } from './CheckInForm'
import { useLogs } from './LogsProvider'
import { useToday } from './useToday'
import { addDays } from '@/lib/time'

function prettyDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

export function CheckIn({ sticky }: { sticky: boolean }) {
  const today = useToday()
  const { logs } = useLogs()
  const [date, setDate] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  if (!today) return <div className="h-96 animate-pulse rounded-2xl bg-ink-card" aria-busy />

  const active = date ?? today
  const yesterday = addDays(today, -1)
  const hasAny = logs.length > 0
  const missedYesterday = hasAny && !dismissed && active === today && !logs.some((l) => l.sleep_date === yesterday)
  const logged = logs.some((l) => l.sleep_date === active)

  return (
    <div>
      <header className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-label-muted">{prettyDate(active)}</p>
          <h1 className="text-[28px] font-bold tracking-tight">
            {active === today ? 'Good morning' : 'Backfill'}
            {logged && <span className="ml-2 align-middle text-sm font-medium text-amber">logged ✓</span>}
          </h1>
        </div>
        {active !== today && (
          <button type="button" onClick={() => setDate(null)} className="text-sm font-medium text-indigo">
            Back to today
          </button>
        )}
      </header>

      <AnimatePresence>
        {missedYesterday && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-indigo-soft px-4 py-3">
              <button type="button" onClick={() => setDate(yesterday)} className="text-left text-[15px] font-medium">
                Yesterday isn’t logged. <span className="text-indigo">Log it →</span>
              </button>
              <button type="button" aria-label="Dismiss" onClick={() => setDismissed(true)} className="px-2 text-label-muted">
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CheckInForm
        key={active}
        sleepDate={active}
        isToday={active === today}
        sticky={sticky}
        onSaved={active !== today ? () => setDate(null) : undefined}
      />
    </div>
  )
}
