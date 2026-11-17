'use client'

import { motion } from 'motion/react'

const spring = { type: 'spring', stiffness: 500, damping: 30 } as const

export function Pill({
  active,
  onClick,
  children,
  tone = 'indigo',
  className = '',
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  tone?: 'indigo' | 'amber'
  className?: string
}) {
  const activeCls = tone === 'amber' ? 'bg-amber text-black' : 'bg-indigo text-white'
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      whileTap={{ scale: 0.94 }}
      transition={spring}
      onClick={onClick}
      className={`min-h-[44px] rounded-full px-4 text-[15px] font-medium transition-colors ${
        active ? activeCls : 'bg-ink-raised text-label-secondary'
      } ${className}`}
    >
      {children}
    </motion.button>
  )
}

export function Rating({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
  tone,
}: {
  label: string
  value: number | null
  onChange: (v: number) => void
  lowLabel: string
  highLabel: string
  tone: 'quality' | 'energy'
}) {
  const fill = (n: number) =>
    tone === 'quality' ? ['bg-q-1', 'bg-q-2', 'bg-q-3', 'bg-q-4', 'bg-q-5'][n - 1] : 'bg-amber'
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[15px] font-medium">{label}</span>
        <span className="text-xs text-label-muted">
          1 {lowLabel} · 5 {highLabel}
        </span>
      </div>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n
          return (
            <motion.button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              whileTap={{ scale: 0.9 }}
              transition={spring}
              onClick={() => onChange(n)}
              className={`h-12 rounded-xl text-lg font-semibold transition-colors ${
                on ? `${fill(n)} ${tone === 'energy' || n >= 4 ? 'text-black' : 'text-white'}` : 'bg-ink-raised text-label-secondary'
              }`}
            >
              {n}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  label: string
}) {
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-11 w-11 rounded-full bg-ink-raised text-xl disabled:opacity-30"
      >
        −
      </motion.button>
      <span className="w-6 text-center text-xl font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-11 w-11 rounded-full bg-ink-raised text-xl disabled:opacity-30"
      >
        +
      </motion.button>
    </div>
  )
}

export function TimeField({
  label,
  value,
  onChange,
  step = 300,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  step?: number
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-label-muted">{label}</span>
      <input
        type="time"
        step={step}
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-12 rounded-xl bg-ink-raised px-3 text-2xl font-semibold tabular-nums outline-none focus:ring-2 focus:ring-indigo/60"
      />
    </label>
  )
}

export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </section>
  )
}
