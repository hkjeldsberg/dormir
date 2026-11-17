'use client'

import { useState } from 'react'
import type { ChartPoint } from '@/lib/insights'
import { addDays, formatDuration, formatNightAxis } from '@/lib/time'

// Validated ordinal ramp (dataviz validator, dark, surface #1C1C1E) — must match tailwind `q`
export const QUALITY_RAMP = ['#4a47a3', '#5b59c4', '#716fdc', '#8f8ded', '#b6b7f8']
const UNRATED = '#48484A'
const GRID = '#38383A'
const AXIS_TEXT = '#8E8E93'
const AMBER = '#F5B041'

const W = 640
const H = 200
const PAD = { top: 18, right: 8, bottom: 22, left: 36 }

interface Day {
  date: string
  point: ChartPoint | null
}

export function windowDays(points: ChartPoint[], endDate: string, days: number): Day[] {
  const byDate = new Map(points.map((p) => [p.date, p]))
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(endDate, i - days + 1)
    return { date, point: byDate.get(date) ?? null }
  })
}

const shortDate = (d: string) => `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}`

function Tooltip({ day, xPct }: { day: Day; xPct: number }) {
  const p = day.point
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-xl bg-ink-raised px-3 py-2 text-xs shadow-xl ring-1 ring-ink-line"
      style={{ left: `clamp(88px, ${xPct}%, calc(100% - 88px))` }}
      role="status"
    >
      <div className="font-semibold text-label">{day.date}</div>
      {p ? (
        <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-2 text-label-secondary">
          <dt>In bed</dt>
          <dd className="text-label">{formatDuration(p.tib)}</dd>
          <dt>Bedtime</dt>
          <dd className="text-label">{formatNightAxis(p.bedtime)}</dd>
          <dt>Quality</dt>
          <dd className="text-label">{p.quality ?? '—'}/5</dd>
          <dt>Energy</dt>
          <dd className="text-label">{p.energy ?? '—'}/5</dd>
          {p.wakings != null && (
            <>
              <dt>Wakings</dt>
              <dd className="text-label">{p.wakings}</dd>
            </>
          )}
          {p.coSleep && (
            <>
              <dt>Co-sleep</dt>
              <dd className="text-label">{formatDuration(p.coSleepMinutes)}</dd>
            </>
          )}
        </dl>
      ) : (
        <div className="mt-1 text-label-muted">Not logged</div>
      )}
    </div>
  )
}

/** Time in bed per night; bar fill = sleep quality (ordinal ramp); ▲ marks co-sleep nights. */
export function TimeInBedChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const maxH = Math.max(10, ...days.map((d) => (d.point ? Math.ceil(d.point.tib / 60) : 0)))
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const colW = innerW / days.length
  const barW = Math.max(3, Math.min(18, colW - 2)) // ≥ 2px surface gap between bars
  const y = (hours: number) => PAD.top + innerH - (hours / maxH) * innerH
  const ticks = [0, 2, 4, 6, 8, 10].filter((t) => t <= maxH)
  const labelEvery = Math.ceil(days.length / 7)

  return (
    <div className="relative">
      {hover != null && <Tooltip day={days[hover]} xPct={((PAD.left + colW * (hover + 0.5)) / W) * 100} />}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Time in bed per night, colored by sleep quality">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={t === 0 ? 1 : 0.5} />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill={AXIS_TEXT}>
              {t}h
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const cx = PAD.left + colW * (i + 0.5)
          const p = d.point
          return (
            <g key={d.date}>
              {p && (
                <>
                  <path
                    d={roundedTopBar(cx - barW / 2, y(p.tib / 60), barW, y(0) - y(p.tib / 60), Math.min(4, barW / 2))}
                    fill={p.quality ? QUALITY_RAMP[p.quality - 1] : UNRATED}
                    opacity={hover == null || hover === i ? 1 : 0.45}
                  />
                  {p.coSleep && (
                    <path
                      d={`M${cx - 4},${y(p.tib / 60) - 10} L${cx + 4},${y(p.tib / 60) - 10} L${cx},${y(p.tib / 60) - 4} Z`}
                      fill={AMBER}
                    />
                  )}
                </>
              )}
              {i % labelEvery === 0 && (
                <text x={cx} y={H - 6} textAnchor="middle" fontSize={10} fill={AXIS_TEXT}>
                  {shortDate(d.date)}
                </text>
              )}
              <rect
                x={PAD.left + colW * i}
                y={PAD.top}
                width={colW}
                height={innerH}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onClick={() => setHover(i)}
              />
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-label-secondary">
        <span className="flex items-center gap-1.5">
          Quality
          {QUALITY_RAMP.map((c, i) => (
            <span key={c} className="flex items-center gap-0.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
              <span className="text-label-muted">{i + 1}</span>
            </span>
          ))}
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="10" height="8" aria-hidden>
            <path d="M1,1 L9,1 L5,7 Z" fill={AMBER} />
          </svg>
          Co-sleep night
        </span>
      </div>
    </div>
  )
}

function roundedTopBar(x: number, top: number, w: number, h: number, r: number): string {
  if (h <= 0) return ''
  const rr = Math.min(r, h)
  return `M${x},${top + h} L${x},${top + rr} Q${x},${top} ${x + rr},${top} L${x + w - rr},${top} Q${x + w},${top} ${x + w},${top + rr} L${x + w},${top + h} Z`
}

/** Bedtime per night on a continuous night axis, with median reference line. */
export function BedtimeChart({ days, median }: { days: Day[]; median: number | null }) {
  const [hover, setHover] = useState<number | null>(null)
  const vals = days.flatMap((d) => (d.point ? [d.point.bedtime] : []))
  if (!vals.length) return <p className="text-sm text-label-muted">No nights in this window.</p>
  const lo = Math.floor((Math.min(...vals) - 15) / 60) * 60
  const hi = Math.ceil((Math.max(...vals) + 15) / 60) * 60
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const colW = innerW / days.length
  // Earlier bedtime at top
  const y = (m: number) => PAD.top + ((m - lo) / (hi - lo)) * innerH
  const ticks: number[] = []
  const step = hi - lo > 240 ? 120 : 60
  for (let t = lo; t <= hi; t += step) ticks.push(t)

  const pts = days.map((d, i) => (d.point ? { x: PAD.left + colW * (i + 0.5), y: y(d.point.bedtime), i } : null))
  // Break line at missing nights
  const segments: string[] = []
  let cur = ''
  for (const p of pts) {
    if (!p) {
      if (cur) segments.push(cur)
      cur = ''
      continue
    }
    cur += `${cur ? 'L' : 'M'}${p.x},${p.y} `
  }
  if (cur) segments.push(cur)

  return (
    <div className="relative">
      {hover != null && <Tooltip day={days[hover]} xPct={((PAD.left + colW * (hover + 0.5)) / W) * 100} />}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Bedtime per night">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={0.5} />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill={AXIS_TEXT}>
              {formatNightAxis(t)}
            </text>
          </g>
        ))}
        {median != null && median >= lo && median <= hi && (
          <g>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(median)} y2={y(median)} stroke={AMBER} strokeWidth={1} strokeDasharray="4 4" />
            <text x={W - PAD.right} y={y(median) - 4} textAnchor="end" fontSize={10} fill={AXIS_TEXT}>
              median {formatNightAxis(median)}
            </text>
          </g>
        )}
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#7A78E6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hover != null && (
          <line
            x1={PAD.left + colW * (hover + 0.5)}
            x2={PAD.left + colW * (hover + 0.5)}
            y1={PAD.top}
            y2={PAD.top + innerH}
            stroke={AXIS_TEXT}
            strokeWidth={0.5}
          />
        )}
        {pts.map(
          (p) =>
            p && (
              <circle
                key={p.i}
                cx={p.x}
                cy={p.y}
                r={hover === p.i ? 5 : 3.5}
                fill="#7A78E6"
                stroke="#1C1C1E"
                strokeWidth={2}
              />
            ),
        )}
        {days.map((d, i) =>
          i % Math.ceil(days.length / 7) === 0 ? (
            <text key={d.date} x={PAD.left + colW * (i + 0.5)} y={H - 6} textAnchor="middle" fontSize={10} fill={AXIS_TEXT}>
              {shortDate(d.date)}
            </text>
          ) : null,
        )}
        {days.map((d, i) => (
          <rect
            key={`hit-${d.date}`}
            x={PAD.left + colW * i}
            y={PAD.top}
            width={colW}
            height={innerH}
            fill="transparent"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onClick={() => setHover(i)}
          />
        ))}
      </svg>
    </div>
  )
}

export function RangeToggle({ value, onChange }: { value: 14 | 30; onChange: (v: 14 | 30) => void }) {
  return (
    <div className="flex rounded-full bg-ink-raised p-0.5 text-xs font-medium" role="radiogroup" aria-label="Range">
      {([14, 30] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1 ${value === v ? 'bg-ink-line text-label' : 'text-label-muted'}`}
        >
          {v}d
        </button>
      ))}
    </div>
  )
}
