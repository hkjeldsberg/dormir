'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useLogs } from './LogsProvider'
import { Card, Pill, Rating, Stepper, TimeField } from './ui'
import { ARRIVAL_PILLS, buildInput, defaultState, stateFromLog, type FormState } from '@/lib/form'
import { FACTOR_KEYS, FACTOR_LABELS, LATENCY_LABELS, type SleepLatency } from '@/lib/types'
import { deviceTimeZone, formatDuration, hhmmToMinutes, localClockMinutes, minutesToHHMM, roundToStep } from '@/lib/time'

type SaveStatus = { kind: 'idle' } | { kind: 'saved' } | { kind: 'error'; message: string }

export function CheckInForm({
  sleepDate,
  isToday,
  sticky,
  onSaved,
}: {
  sleepDate: string
  isToday: boolean
  /** Sticky full-width CTA above the tab bar (main check-in) vs inline (edit sheet) */
  sticky: boolean
  onSaved?: () => void
}) {
  const { logs, childName, save } = useLogs()
  const existing = logs.find((l) => l.sleep_date === sleepDate)
  const tz = existing?.tz ?? deviceTimeZone()

  const [state, setState] = useState<FormState>(() =>
    existing ? stateFromLog(existing) : defaultState(sleepDate, logs, { isToday, now: new Date(), tz }),
  )
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' })
  const [validation, setValidation] = useState<string | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }))
    setValidation(null)
    if (status.kind !== 'idle') setStatus({ kind: 'idle' })
  }

  const tibMinutes = (() => {
    const b = hhmmToMinutes(state.bedtime)
    const w = hhmmToMinutes(state.wake)
    const bedAxis = b < 720 ? b + 1440 : b
    return w + 1440 - bedAxis
  })()

  async function submit() {
    const built = buildInput(state, sleepDate, tz)
    if (!built.ok) {
      setValidation(built.error)
      return
    }
    setStatus({ kind: 'saved' }) // optimistic
    try {
      await save(built.input)
      onSaved?.()
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message })
    }
  }

  const cta = (
    <div className="space-y-2">
      <AnimatePresence>
        {(validation || status.kind === 'error') && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex items-center justify-between gap-3 rounded-xl bg-[#3A1715] px-4 py-3 text-sm font-medium text-danger ring-1 ring-danger/30"
          >
            <span>{validation ?? (status.kind === 'error' ? `Not saved: ${status.message}` : '')}</span>
            {status.kind === 'error' && (
              <button type="button" onClick={submit} className="shrink-0 font-semibold underline">
                Retry
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={submit}
        className={`h-14 w-full rounded-2xl text-lg font-semibold transition-colors ${
          status.kind === 'saved' ? 'bg-ink-raised text-amber' : 'bg-amber text-black'
        }`}
      >
        {status.kind === 'saved' ? '✓ Saved' : existing ? 'Update Night' : 'Save Night'}
      </motion.button>
    </div>
  )

  return (
    <div className={sticky ? 'pb-36' : ''}>
      <div className="space-y-3">
        {/* Sleep */}
        <Card title="Sleep">
          <div className="grid grid-cols-2 gap-3">
            <TimeField label="Bedtime" value={state.bedtime} onChange={(v) => set('bedtime', v)} />
            <div className="flex flex-col gap-1">
              <TimeField label="Woke" value={state.wake} onChange={(v) => set('wake', v)} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-label-secondary">
              In bed <span className="font-semibold text-label">{formatDuration(tibMinutes)}</span>
            </span>
            {isToday && (
              <Pill
                active={false}
                onClick={() => set('wake', minutesToHHMM(roundToStep(localClockMinutes(new Date(), tz), 5)))}
              >
                ☀︎ Just woke up
              </Pill>
            )}
          </div>

          <div className="mt-4">
            <span className="text-xs font-medium uppercase tracking-wide text-label-muted">Fell asleep in</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(LATENCY_LABELS) as SleepLatency[]).map((k) => (
                <Pill key={k} active={state.latency === k} onClick={() => set('latency', state.latency === k ? null : k)}>
                  {LATENCY_LABELS[k]}
                </Pill>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[15px] font-medium">Night wakings</span>
            <Stepper label="night wakings" value={state.wakings} min={0} max={10} onChange={(v) => set('wakings', v)} />
          </div>
        </Card>

        {/* Co-sleep */}
        <Card>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            aria-expanded={state.coSleep}
            onClick={() => set('coSleep', !state.coSleep)}
            className="flex w-full items-center justify-between"
          >
            <span className="text-[17px] font-semibold">
              <span aria-hidden>🧸 </span>
              {childName} came into bed
            </span>
            <span
              className={`relative h-8 w-14 rounded-full transition-colors ${state.coSleep ? 'bg-amber' : 'bg-ink-raised'}`}
              aria-hidden
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 600, damping: 35 }}
                className={`absolute top-1 h-6 w-6 rounded-full bg-white ${state.coSleep ? 'right-1' : 'left-1'}`}
              />
            </span>
          </motion.button>
          <AnimatePresence initial={false}>
            {state.coSleep && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                className="overflow-hidden"
              >
                <div className="pt-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-label-muted">Arrived</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ARRIVAL_PILLS.map((t) => (
                      <Pill key={t} tone="amber" active={state.coStart === t} onClick={() => set('coStart', t)} className="px-3">
                        {t}
                      </Pill>
                    ))}
                  </div>
                  <div className="mt-2 w-36">
                    <TimeField label="Custom" value={state.coStart} step={900} onChange={(v) => set('coStart', v)} />
                  </div>

                  <span className="mt-4 block text-xs font-medium uppercase tracking-wide text-label-muted">Until</span>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <Pill tone="amber" active={state.coUntilMorning} onClick={() => set('coUntilMorning', true)}>
                      Morning
                    </Pill>
                    <Pill tone="amber" active={!state.coUntilMorning} onClick={() => set('coUntilMorning', false)}>
                      Went back
                    </Pill>
                  </div>
                  {!state.coUntilMorning && (
                    <div className="mt-2 w-36">
                      <TimeField label="Left at" value={state.coEnd} step={900} onChange={(v) => set('coEnd', v)} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Factors */}
        <Card title="Factors">
          <div className="flex flex-wrap gap-2">
            <Pill
              active={state.creatine}
              onClick={() => {
                const next = !state.creatine
                setState((s) => ({ ...s, creatine: next, creatineTiming: next ? s.creatineTiming : null }))
                setValidation(null)
              }}
            >
              ⚡︎ 10g Creatine
            </Pill>
            {FACTOR_KEYS.map((k) => (
              <Pill key={k} active={state.factors[k]} onClick={() => set('factors', { ...state.factors, [k]: !state.factors[k] })}>
                {FACTOR_LABELS[k]}
              </Pill>
            ))}
          </div>
          <AnimatePresence initial={false}>
            {state.creatine && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 pt-3">
                  <span className="text-xs text-label-muted">Creatine taken</span>
                  {(['morning', 'afternoon_evening'] as const).map((t) => (
                    <Pill
                      key={t}
                      active={state.creatineTiming === t}
                      onClick={() => set('creatineTiming', state.creatineTiming === t ? null : t)}
                      className="min-h-[36px] px-3 text-sm"
                    >
                      {t === 'morning' ? 'Morning' : 'Afternoon–Evening'}
                    </Pill>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Outcomes */}
        <Card className="space-y-5">
          <Rating
            label="Sleep quality"
            tone="quality"
            lowLabel="awful"
            highLabel="great"
            value={state.quality}
            onChange={(v) => set('quality', v)}
          />
          <Rating
            label="Morning energy"
            tone="energy"
            lowLabel="drained"
            highLabel="sharp"
            value={state.energy}
            onChange={(v) => set('energy', v)}
          />
          <input
            type="text"
            maxLength={280}
            value={state.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Note (optional) — bad dream, teething…"
            aria-label="Notes"
            className="h-12 w-full rounded-xl bg-ink-raised px-3 text-[15px] outline-none placeholder:text-label-muted focus:ring-2 focus:ring-indigo/60"
          />
        </Card>
      </div>

      {sticky ? (
        <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-20 bg-gradient-to-t from-black via-black/95 to-transparent px-4 pb-3 pt-6 lg:hidden">
          {cta}
        </div>
      ) : (
        <div className="mt-4">{cta}</div>
      )}
    </div>
  )
}
