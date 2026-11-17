'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useLogs } from './LogsProvider'
import { Flower, MoonRating, Pill, Stepper, TimeBox, Toggle } from './ui'
import { ARRIVAL_PILLS, buildInput, defaultState, stateFromLog, type FormState } from '@/lib/form'
import { FACTOR_KEYS, FACTOR_LABELS, LATENCY_LABELS, type CreatineTiming, type SleepLatency } from '@/lib/types'
import { deviceTimeZone, hhmmToMinutes, localClockMinutes, minutesToHHMM, roundToStep } from '@/lib/time'
import { durationWords } from '@/lib/words'

type SaveStatus = { kind: 'idle' } | { kind: 'saved' } | { kind: 'error'; message: string }

const drawer = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { type: 'spring', stiffness: 400, damping: 36 },
} as const

/** Creatine pill cycles: off → morning → evening → off */
function nextCreatine(on: boolean, timing: CreatineTiming | null): { creatine: boolean; creatineTiming: CreatineTiming | null } {
  if (!on) return { creatine: true, creatineTiming: 'morning' }
  if (timing === 'morning') return { creatine: true, creatineTiming: 'afternoon_evening' }
  if (timing === 'afternoon_evening') return { creatine: false, creatineTiming: null }
  return { creatine: true, creatineTiming: 'morning' } // on but untimed
}

function creatineLabel(on: boolean, timing: CreatineTiming | null): string {
  if (!on) return 'Creatine 10g'
  if (timing === 'morning') return 'Creatine 10g · morning'
  if (timing === 'afternoon_evening') return 'Creatine 10g · evening'
  return 'Creatine 10g'
}

export function CheckInForm({
  sleepDate,
  isToday,
  heading,
  sticky,
  onSaved,
}: {
  sleepDate: string
  isToday: boolean
  heading: string
  /** Sticky full-width CTA above the tab bar (main check-in) vs inline (edit sheet, desktop) */
  sticky: boolean
  onSaved?: () => void
}) {
  const { logs, childName, save } = useLogs()
  const existing = logs.find((l) => l.sleep_date === sleepDate)
  const tz = existing?.tz ?? deviceTimeZone()

  const [state, setState] = useState<FormState>(() =>
    existing ? stateFromLog(existing) : defaultState(sleepDate, logs, { isToday, now: new Date(), tz }),
  )
  const [coOpen, setCoOpen] = useState(false)
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' })
  const [validation, setValidation] = useState<string | null>(null)

  const patch = (p: Partial<FormState>) => {
    setState((s) => ({ ...s, ...p }))
    setValidation(null)
    if (status.kind !== 'idle') setStatus({ kind: 'idle' })
  }
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => patch({ [key]: value } as Partial<FormState>)

  const tibMinutes = (() => {
    const b = hhmmToMinutes(state.bedtime)
    const bedAxis = b < 720 ? b + 1440 : b
    return hhmmToMinutes(state.wake) + 1440 - bedAxis
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

  const coSummary = `at ${state.coStart} · ${state.coUntilMorning ? 'until morning' : `until ${state.coEnd}`}`

  const cta = (
    <div className="space-y-2">
      <AnimatePresence>
        {(validation || status.kind === 'error') && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex items-center justify-between gap-3 rounded-card border border-rose/60 bg-night px-4 py-3 text-sm text-rose"
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
        whileTap={{ scale: 0.98 }}
        onClick={submit}
        className={`h-[60px] w-full rounded-leaf-lg font-serif text-[23px] transition-colors ${
          status.kind === 'saved' ? 'border border-sage bg-transparent italic text-sage' : 'bg-cream text-night'
        }`}
      >
        {status.kind === 'saved' ? 'Pressed into the book' : existing ? 'Press the night again' : 'Press the night into the book'}
      </motion.button>
    </div>
  )

  return (
    <div className={sticky ? 'pb-40' : ''}>
      {/* Arch hero */}
      <section
        className="border border-line bg-surface px-5 pb-5 pt-10 text-center"
        style={{ borderRadius: '50% 50% 28px 28px / 160px 160px 28px 28px' }}
      >
        <Flower size={60} className="mx-auto" />
        <h1 className="mt-4 font-serif text-[44px] leading-none tracking-tight text-cream">{heading}</h1>
        <p className="mt-3 font-serif text-[19px] italic text-rose">
          {tibMinutes > 0 && tibMinutes <= 20 * 60 ? `${durationWords(tibMinutes)} in bloom` : 'check the hours'}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <TimeBox label="to bed" value={state.bedtime} onChange={(v) => set('bedtime', v)} />
          <TimeBox label="awoke" value={state.wake} onChange={(v) => set('wake', v)} />
        </div>
        {isToday && (
          <button
            type="button"
            onClick={() => set('wake', minutesToHHMM(roundToStep(localClockMinutes(new Date(), tz), 5)))}
            className="mt-3 font-serif text-[16px] italic text-mist underline decoration-line underline-offset-4"
          >
            just woke up
          </button>
        )}
      </section>

      {/* Rows */}
      <div className="mt-6 space-y-5 px-1">
        <div className="flex items-center justify-between gap-3">
          <span className="row-label">Drifted off</span>
          <div className="flex gap-2">
            {(Object.keys(LATENCY_LABELS) as SleepLatency[]).map((k) => (
              <Pill key={k} active={state.latency === k} onClick={() => set('latency', state.latency === k ? null : k)} className="px-3">
                {LATENCY_LABELS[k]}
              </Pill>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="row-label">Woke in the night</span>
          <Stepper label="night wakings" value={state.wakings} min={0} max={10} onChange={(v) => set('wakings', v)} />
        </div>
      </div>

      {/* Co-sleep card */}
      <section className="card mt-6 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={!state.coSleep}
            aria-expanded={state.coSleep ? coOpen : undefined}
            onClick={() => setCoOpen((o) => !o)}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block font-serif text-[24px] italic leading-tight text-cream">{childName} came to visit</span>
            {state.coSleep && <span className="mt-0.5 block text-[15px] text-mist">{coSummary}</span>}
          </button>
          <Toggle
            on={state.coSleep}
            label={`${childName} came to visit`}
            onClick={() => {
              const on = !state.coSleep
              patch({ coSleep: on })
              setCoOpen(on)
            }}
          />
        </div>
        <AnimatePresence initial={false}>
          {state.coSleep && coOpen && (
            <motion.div {...drawer} className="overflow-hidden">
              <div className="pt-4">
                <span className="eyebrow">arrived</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ARRIVAL_PILLS.map((t) => (
                    <Pill key={t} active={state.coStart === t} onClick={() => set('coStart', t)} className="lining px-3">
                      {t}
                    </Pill>
                  ))}
                </div>
                <div className="mt-2 w-32">
                  <TimeBox size="sm" label="or exactly" value={state.coStart} step={900} onChange={(v) => set('coStart', v)} />
                </div>
                <span className="eyebrow mt-4 block">stayed</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill active={state.coUntilMorning} onClick={() => set('coUntilMorning', true)}>
                    Until morning
                  </Pill>
                  <Pill active={!state.coUntilMorning} onClick={() => set('coUntilMorning', false)}>
                    Went back
                  </Pill>
                </div>
                {!state.coUntilMorning && (
                  <div className="mt-2 w-32">
                    <TimeBox size="sm" label="left at" value={state.coEnd} step={900} onChange={(v) => set('coEnd', v)} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Factors */}
      <section className="mt-7 px-1">
        <h2 className="eyebrow mb-3">What grew yesterday</h2>
        <div className="flex flex-wrap gap-2.5">
          <Pill
            active={state.creatine}
            onClick={() => patch(nextCreatine(state.creatine, state.creatineTiming))}
            ariaLabel={`${creatineLabel(state.creatine, state.creatineTiming)}${state.creatine ? '' : ', off'}. Tap to cycle off, morning, evening.`}
          >
            {creatineLabel(state.creatine, state.creatineTiming)}
          </Pill>
          {FACTOR_KEYS.map((k) => (
            <Pill key={k} active={state.factors[k]} onClick={() => set('factors', { ...state.factors, [k]: !state.factors[k] })}>
              {FACTOR_LABELS[k]}
            </Pill>
          ))}
        </div>
      </section>

      {/* Outcomes */}
      <section className="mt-7 space-y-3 px-1">
        <MoonRating label="Rest" value={state.quality} onChange={(v) => set('quality', v)} />
        <MoonRating label="Vigour" value={state.energy} onChange={(v) => set('energy', v)} />
        <p className="text-right text-[13px] text-mist">new moon = 1 · full moon = 5</p>
        <input
          type="text"
          maxLength={280}
          value={state.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="a note for the margin…"
          aria-label="Notes"
          className="h-12 w-full border-b border-line bg-transparent font-serif text-[18px] italic text-cream outline-none placeholder:text-moss focus:border-sage"
        />
      </section>

      {sticky ? (
        <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-20 bg-gradient-to-t from-night via-night/95 to-transparent px-4 pb-3 pt-8 lg:hidden">
          {cta}
        </div>
      ) : (
        <div className="mt-6">{cta}</div>
      )}
    </div>
  )
}
