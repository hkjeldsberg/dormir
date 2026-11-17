'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckInForm } from './CheckInForm'
import { useLogs } from './LogsProvider'

export function EditSheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { logs, remove } = useLogs()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const exists = date != null && logs.some((l) => l.sleep_date === date)

  useEffect(() => {
    setConfirming(false)
    setError(null)
    if (!date) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [date, onClose])

  async function doDelete() {
    if (!date) return
    try {
      onClose()
      await remove(date)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <AnimatePresence>
      {date && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Edit ${date}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] max-w-xl overflow-y-auto rounded-t-3xl bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 ring-1 ring-ink-line lg:bottom-auto lg:top-[5dvh] lg:rounded-3xl"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink-line lg:hidden" aria-hidden />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold">{date}</h2>
              <button type="button" onClick={onClose} className="text-[15px] font-medium text-indigo">
                Close
              </button>
            </div>
            <CheckInForm key={date} sleepDate={date} isToday={false} sticky={false} onSaved={onClose} />
            {exists && (
              <div className="mt-3">
                {confirming ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={doDelete} className="h-12 flex-1 rounded-2xl bg-danger font-semibold text-black">
                      Delete permanently
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className="h-12 flex-1 rounded-2xl bg-ink-raised">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirming(true)} className="h-12 w-full rounded-2xl text-danger">
                    Delete night
                  </button>
                )}
              </div>
            )}
            {error && <p role="alert" className="mt-2 text-center text-sm text-danger">{error}</p>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
