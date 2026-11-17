'use client'

import { useMemo, useState } from 'react'
import { useLogs } from './LogsProvider'
import { useToday } from './useToday'
import { Card, Pill } from './ui'
import { BedtimeChart, RangeToggle, TimeInBedChart, windowDays } from './Charts'
import { computeInsights, MIN_GROUP_N, OUTCOMES, UNLOCK_NIGHTS, type Comparison, type OutcomeKey } from '@/lib/insights'
import { formatDuration, formatNightAxis } from '@/lib/time'

type Unit = 'score' | 'minutes' | 'latency'

function fmtValue(v: number | null, unit: Unit): string {
  if (v == null) return '—'
  if (unit === 'minutes') return formatDuration(Math.round(v))
  return v.toFixed(1)
}

function fmtDiff(v: number, unit: Unit): string {
  const sign = v > 0 ? '+' : v < 0 ? '−' : '±'
  const abs = Math.abs(v)
  return unit === 'minutes' ? `${sign}${Math.round(abs)}m` : `${sign}${abs.toFixed(1)}`
}

export function ComparisonRow({
  label,
  c,
  unit,
  aLabel,
  bLabel,
}: {
  label: string
  c: Comparison
  unit: Unit
  aLabel: string
  bLabel: string
}) {
  if (!c.ready) {
    return (
      <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
        <span className="text-label-secondary">{label}</span>
        <span className="text-right text-xs text-label-muted">
          Need {c.need} more {c.nA < c.nB ? aLabel : bLabel} night{c.need === 1 ? '' : 's'} (n {c.nA}/{c.nB})
        </span>
      </div>
    )
  }
  const clear = c.ci && (c.ci[0] > 0 || c.ci[1] < 0) // CI excludes zero
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-label-secondary">{label}</span>
        <span className={`text-lg font-semibold tabular-nums ${clear ? 'text-label' : 'text-label-secondary'}`}>
          {fmtDiff(c.diff!, unit)}
          {clear && <span className="ml-1 text-xs font-medium text-amber">●</span>}
        </span>
      </div>
      <div className="flex justify-between text-xs text-label-muted tabular-nums">
        <span>
          {aLabel} {fmtValue(c.meanA, unit)} (n {c.nA}) · {bLabel} {fmtValue(c.meanB, unit)} (n {c.nB})
        </span>
        <span>
          95% CI {fmtDiff(c.ci![0], unit)} to {fmtDiff(c.ci![1], unit)}
        </span>
      </div>
    </div>
  )
}

function OutcomeRows({ comps, aLabel, bLabel }: { comps: Record<OutcomeKey, Comparison>; aLabel: string; bLabel: string }) {
  return (
    <div className="divide-y divide-ink-line">
      {OUTCOMES.map((o) => (
        <ComparisonRow key={o.key} label={o.label} c={comps[o.key]} unit={o.unit} aLabel={aLabel} bLabel={bLabel} />
      ))}
    </div>
  )
}

export function TrendCharts() {
  const { logs } = useLogs()
  const today = useToday()
  const [range, setRange] = useState<14 | 30>(14)
  const insights = useMemo(() => computeInsights(logs, { includeSick: true }), [logs])
  const end = today ?? logs[logs.length - 1]?.sleep_date
  if (!end) return null
  const days = windowDays(insights.series, end, range)

  return (
    <div className="space-y-3">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="card-title mb-0">Time in bed</h2>
          <RangeToggle value={range} onChange={setRange} />
        </div>
        <TimeInBedChart days={days} />
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="card-title mb-0">Bedtime</h2>
          <span className="text-xs text-label-muted">earlier ↑</span>
        </div>
        <BedtimeChart days={days} median={insights.consistency.medianBedtime} />
      </Card>
    </div>
  )
}

export function InsightsView() {
  const { logs, childName } = useLogs()
  const [includeSick, setIncludeSick] = useState(false)
  const ins = useMemo(() => computeInsights(logs, { includeSick }), [logs, includeSick])
  const c = ins.creatine

  return (
    <div className="space-y-3">
      <header className="mb-1">
        <h1 className="text-[28px] font-bold tracking-tight">Insights</h1>
        <p className="text-sm text-label-muted">
          Associations from your own nights — not causes. <span className="text-amber">●</span> = 95% CI excludes zero.
        </p>
      </header>

      <TrendCharts />

      {!ins.unlocked ? (
        <Card>
          <h2 className="text-lg font-semibold">Factor analysis unlocks at {UNLOCK_NIGHTS} nights</h2>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-raised">
            <div className="h-full rounded-full bg-amber" style={{ width: `${(ins.totalNights / UNLOCK_NIGHTS) * 100}%` }} />
          </div>
          <p className="mt-2 text-sm text-label-muted">
            {ins.totalNights} / {UNLOCK_NIGHTS} logged
          </p>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-label-muted">
              {ins.analysedNights} nights analysed{ins.excludedSick ? ` · ${ins.excludedSick} sick excluded` : ''} · min {MIN_GROUP_N} per group
            </p>
            <Pill active={includeSick} onClick={() => setIncludeSick((v) => !v)} className="min-h-[32px] px-3 text-xs">
              Include sick
            </Pill>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {/* Consistency */}
            <Card title="Bedtime consistency">
              {ins.consistency.sd14 != null ? (
                <div className="mb-2 flex items-baseline gap-3">
                  <span className="text-3xl font-bold tabular-nums">±{Math.round(ins.consistency.sd14)}m</span>
                  <span className="text-[15px] font-semibold text-amber">{ins.consistency.band}</span>
                  <span className="text-xs text-label-muted">SD, last 14 nights</span>
                </div>
              ) : null}
              {ins.consistency.medianBedtime != null && (
                <p className="mb-1 text-xs text-label-muted">
                  On schedule = within ±30 min of median {formatNightAxis(ins.consistency.medianBedtime)}
                </p>
              )}
              <OutcomeRows comps={ins.consistency.onScheduleVsOff} aLabel="on" bLabel="off" />
            </Card>

            {/* Co-sleep */}
            <Card title={`${childName} co-sleeping`}>
              <table className="mb-2 w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-xs text-label-muted">
                    <th className="py-1 text-left font-medium">Duration</th>
                    <th className="text-right font-medium">n</th>
                    <th className="text-right font-medium">Quality</th>
                    <th className="text-right font-medium">Energy</th>
                    <th className="text-right font-medium">In bed</th>
                  </tr>
                </thead>
                <tbody>
                  {ins.coSleep.buckets.map((b) => (
                    <tr key={b.label} className="border-t border-ink-line">
                      <td className="py-1.5">{b.label}</td>
                      <td className="text-right text-label-muted">{b.n}</td>
                      <td className="text-right">{b.quality?.toFixed(1) ?? '—'}</td>
                      <td className="text-right">{b.energy?.toFixed(1) ?? '—'}</td>
                      <td className="text-right">{b.duration != null ? formatDuration(Math.round(b.duration)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 className="mt-3 text-xs font-semibold text-label-muted">≥ 2h vs none</h3>
              <OutcomeRows comps={ins.coSleep.longVsNone} aLabel="≥2h" bLabel="none" />
              <h3 className="mt-3 text-xs font-semibold text-label-muted">&lt; 2h vs none</h3>
              <OutcomeRows comps={ins.coSleep.shortVsNone} aLabel="<2h" bLabel="none" />
              <h3 className="mt-3 text-xs font-semibold text-label-muted">Arrival before 03:00 vs after</h3>
              <OutcomeRows comps={ins.coSleep.earlyVsLate} aLabel="early" bLabel="late" />
            </Card>

            {/* Creatine */}
            <Card title="Creatine 10g">
              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: '14-day', a: c.adherence14 },
                  { label: '30-day', a: c.adherence30 },
                ].map(({ label, a }) => (
                  <div key={label} className="rounded-xl bg-ink-raised py-2">
                    <div className="text-xl font-bold tabular-nums">{a && a.logged ? `${Math.round((a.taken / a.logged) * 100)}%` : '—'}</div>
                    <div className="text-xs text-label-muted">
                      {label} {a ? `(${a.taken}/${a.logged})` : ''}
                    </div>
                  </div>
                ))}
                <div className="rounded-xl bg-ink-raised py-2">
                  <div className="text-xl font-bold tabular-nums">{c.streak}</div>
                  <div className="text-xs text-label-muted">day streak</div>
                </div>
              </div>
              <h3 className="text-xs font-semibold text-label-muted">Morning vs afternoon–evening dosing</h3>
              <div className="divide-y divide-ink-line">
                <ComparisonRow label="Latency (1 <15m · 3 >30m)" c={c.timing.latency} unit="latency" aLabel="AM" bLabel="PM" />
                <ComparisonRow label="Sleep quality" c={c.timing.quality} unit="score" aLabel="AM" bLabel="PM" />
                <ComparisonRow label="Morning energy" c={c.timing.energy} unit="score" aLabel="AM" bLabel="PM" />
              </div>
              <h3 className="mt-3 text-xs font-semibold text-label-muted">Loaded vs unloaded (needs off-periods — likely empty)</h3>
              <OutcomeRows comps={c.loadedVsUnloaded} aLabel="loaded" bLabel="unloaded" />
              <h3 className="mt-3 text-xs font-semibold text-label-muted">Hypothesis: energy on co-sleep nights, loaded vs unloaded</h3>
              <ComparisonRow label="Morning energy" c={c.coSleepEnergyLoadedVsUnloaded} unit="score" aLabel="loaded" bLabel="unloaded" />
            </Card>
          </div>

          {/* Factor impact */}
          <h2 className="pt-3 text-lg font-semibold">Factor impact (with − without)</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ins.factorCards.map((f) => (
              <Card key={f.key} title={f.label}>
                <OutcomeRows comps={f.outcomes} aLabel="with" bLabel="without" />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
