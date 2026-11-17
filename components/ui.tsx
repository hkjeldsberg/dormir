'use client'

import { motion } from 'motion/react'

const spring = { type: 'spring', stiffness: 500, damping: 30 } as const

/** Leaf-cut pill: outlined when off, sage-filled when on. */
export function Pill({
  active,
  onClick,
  children,
  className = '',
  ariaLabel,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      whileTap={{ scale: 0.95 }}
      transition={spring}
      onClick={onClick}
      className={`min-h-[44px] rounded-leaf border px-4 text-[15px] font-medium transition-colors ${
        active ? 'border-sage bg-sage text-night' : 'border-line text-cream hover:border-moss'
      } ${className}`}
    >
      {children}
    </motion.button>
  )
}

/** Moon phase glyph: 1 = new moon … 5 = full moon (waxing, lit from the right). */
export function MoonGlyph({ phase, active, size = 44 }: { phase: number; active: boolean; size?: number }) {
  const r = 15
  const c = 22
  const lit = active ? '#EDEFE6' : '#5E7A68'
  // Terminator ellipse x-radius: crescent (2) → half (3) → gibbous (4)
  const litPath = (() => {
    switch (phase) {
      case 2: // crescent: outer right arc + inner arc bulging right
        return `M${c},${c - r} A${r},${r} 0 0 1 ${c},${c + r} A${r * 0.55},${r} 0 0 0 ${c},${c - r} Z`
      case 3: // first quarter: right half
        return `M${c},${c - r} A${r},${r} 0 0 1 ${c},${c + r} Z`
      case 4: // gibbous: right half + ellipse bulging left
        return `M${c},${c - r} A${r},${r} 0 0 1 ${c},${c + r} A${r * 0.55},${r} 0 0 1 ${c},${c - r} Z`
      default:
        return null
    }
  })()
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden>
      {active && <circle cx={c} cy={c} r={20.5} fill="none" stroke="#D9A6A0" strokeWidth={1.5} />}
      {phase === 5 ? (
        <circle cx={c} cy={c} r={r} fill={lit} />
      ) : (
        <>
          <circle cx={c} cy={c} r={r - 0.75} fill="none" stroke={lit} strokeWidth={1.5} />
          {litPath && <path d={litPath} fill={lit} />}
        </>
      )}
    </svg>
  )
}

export function MoonRating({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="row-label">{label}</span>
      <div role="radiogroup" aria-label={`${label}, new moon 1 to full moon 5`} className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}`}
            whileTap={{ scale: 0.88 }}
            transition={spring}
            onClick={() => onChange(n)}
            className="rounded-full"
          >
            <MoonGlyph phase={n} active={value === n} />
          </motion.button>
        ))}
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
  const btn = 'h-11 w-11 rounded-full border border-line text-xl text-cream disabled:opacity-30'
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        aria-label={`Fewer ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={btn}
      >
        −
      </motion.button>
      <span className="oldstyle w-7 text-center text-[28px] leading-none" aria-live="polite">
        {value}
      </span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        aria-label={`More ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={btn}
      >
        +
      </motion.button>
    </div>
  )
}

/** Inset time box: small sans label over a large old-style serif time (native iOS wheel on tap). */
export function TimeBox({
  label,
  value,
  onChange,
  step = 300,
  size = 'lg',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  step?: number
  size?: 'lg' | 'sm'
}) {
  return (
    <label className="flex flex-col items-center rounded-card border border-line bg-night px-2 pb-2 pt-3">
      <span className="text-[13px] text-mist">{label}</span>
      <input
        type="time"
        step={step}
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className={`oldstyle w-full bg-transparent text-center text-cream outline-none ${
          size === 'lg' ? 'h-14 text-[40px]' : 'h-10 text-[26px]'
        }`}
      />
    </label>
  )
}

export function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative inline-block h-[30px] w-[54px] shrink-0 rounded-full border transition-colors ${
        on ? 'border-rose bg-rose' : 'border-line bg-night'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        className={`absolute top-[3px] h-[22px] w-[22px] rounded-full ${on ? 'right-[3px] bg-night' : 'left-[3px] bg-moss'}`}
      />
    </button>
  )
}

/** Four-petal flower mark from the design. */
export function Flower({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <g fill="none" stroke="#8FB89A" strokeWidth={2}>
        <ellipse cx="32" cy="15" rx="6.5" ry="10" />
        <ellipse cx="32" cy="49" rx="6.5" ry="10" />
        <ellipse cx="15" cy="32" rx="10" ry="6.5" />
        <ellipse cx="49" cy="32" rx="10" ry="6.5" />
      </g>
      <circle cx="32" cy="32" r="7" fill="#EDEFE6" />
    </svg>
  )
}

export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {title && <h2 className="eyebrow mb-4">{title}</h2>}
      {children}
    </section>
  )
}

/** Garden date: "17 · XI · Tuesday" */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
export function gardenDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })
  return `${d} · ${ROMAN[m - 1]} · ${weekday}`
}
