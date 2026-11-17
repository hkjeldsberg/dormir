'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckInForm } from './CheckInForm'
import { useLogs } from './LogsProvider'
import { useToday } from './useToday'
import { gardenDate } from './ui'
import { addDays } from '@/lib/time'

const DISMISS_KEY = 'dormir:backfill-dismissed'

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY)
  } catch {
    return null
  }
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`font-serif text-[34px] italic leading-none text-sage ${className}`}>dormir</span>
}

export function CheckIn({ sticky }: { sticky: boolean }) {
  const today = useToday()
  const { logs } = useLogs()
  const [date, setDate] = useState<string | null>(null)
  // The missed date whose reminder was dismissed; persisted so it never asks again for that date
  const [dismissedDate, setDismissedDate] = useState<string | null>(null)
  useEffect(() => setDismissedDate(readDismissed()), [])

  if (!today) return <div className="h-[520px] animate-pulse rounded-card bg-surface" aria-busy />

  const active = date ?? today
  const yesterday = addDays(today, -1)
  const missedYesterday =
    logs.length > 0 && dismissedDate !== yesterday && active === today && !logs.some((l) => l.sleep_date === yesterday)

  const dismiss = () => {
    setDismissedDate(yesterday)
    try {
      localStorage.setItem(DISMISS_KEY, yesterday)
    } catch {
      // storage unavailable (private mode) — dismissal lasts for this session only
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <Wordmark />
        <div className="text-right">
          <p className="lining text-[15px] text-mist">{gardenDate(active)}</p>
          {active !== today && (
            <button type="button" onClick={() => setDate(null)} className="font-serif text-[15px] italic text-rose">
              back to today
            </button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {missedYesterday && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 flex items-center justify-between rounded-card border border-line px-4 py-3">
              <button type="button" onClick={() => setDate(yesterday)} className="text-left">
                <span className="font-serif text-[18px] italic text-cream">Yesterday left a blank page.</span>{' '}
                <span className="text-[14px] text-rose">Fill it →</span>
              </button>
              <button type="button" aria-label="Dismiss" onClick={dismiss} className="px-2 text-mist">
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
        heading={active === today ? 'Good morning' : 'A night past'}
        sticky={sticky}
        onSaved={active !== today ? () => setDate(null) : undefined}
      />
    </div>
  )
}
