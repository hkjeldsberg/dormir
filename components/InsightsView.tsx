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
  // Sign from the *displayed* value, so tiny differences read ±0.0 rather than −0.0
  const shown = unit === 'minutes' ? Math.round(Math.abs(v)) : Number(Math.abs(v).toFixed(1))
  const sign = shown === 0 ? '±' : v > 0 ? '+' : '−'
  return unit === 'minutes' ? `${sign}${shown}m` : `${sign}${shown.toFixed(1)}`
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
        <span className="text-mist">{label}</span>
        <span className="text-right text-xs text-mist">
          Need {c.need} more {c.nA < c.nB ? aLabel : bLabel} night{c.need === 1 ? '' : 's'} (n {c.nA}/{c.nB})
        </span>
      </div>
    )
  }
  const clear = c.ci && (c.ci[0] > 0 || c.ci[1] < 0) // CI excludes zero
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-mist">{label}</span>
        <span className={`font-serif text-[24px] tabular-nums ${clear ? 'text-cream' : 'text-mist'}`}>
          {fmtDiff(c.diff!, unit)}
          {clear && <span className="ml-1 text-xs font-medium text-rose">●</span>}
        </span>
      </div>
      <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-mist tabular-nums sm:flex-row sm:justify-between">
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
    <div className="divide-y divide-line">
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
          <h2 className="eyebrow">Time in bed</h2>
          <RangeToggle value={range} onChange={setRange} />
        </div>
        <TimeInBedChart days={days} />
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">Bedtime</h2>
          <span className="text-xs text-mist">earlier ↑</span>
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
        <h1 className="font-serif text-[40px] leading-none">Insights</h1>
        <p className="text-sm text-mist">
          Associations from your own nights — not causes. <span className="text-rose">●</span> = 95% CI excludes zero.
        </p>
      </header>

      <TrendCharts />

      {!ins.unlocked ? (
        <Card>
          <h2 className="font-serif text-[24px]">Factor analysis unlocks at {UNLOCK_NIGHTS} nights</h2>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-night">
            <div className="h-full rounded-full bg-sage" style={{ width: `${(ins.totalNights / UNLOCK_NIGHTS) * 100}%` }} />
          </div>
          <p className="mt-2 text-sm text-mist">
            {ins.totalNights} / {UNLOCK_NIGHTS} logged
          </p>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-mist">
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
                  <span className="oldstyle text-[44px] leading-none">±{Math.round(ins.consistency.sd14)}m</span>
                  <span className="font-serif text-[20px] italic text-rose">{ins.consistency.band}</span>
                  <span className="text-xs text-mist">SD, last 14 nights</span>
                </div>
              ) : null}
              {ins.consistency.medianBedtime != null && (
                <p className="mb-1 text-xs text-mist">
                  On schedule = within ±30 min of median {formatNightAxis(ins.consistency.medianBedtime)}
                </p>
              )}
              <OutcomeRows comps={ins.consistency.onScheduleVsOff} aLabel="on" bLabel="off" />
            </Card>

            {/* Co-sleep */}
            <Card title={`${childName}'s visits`}>
              <table className="mb-2 w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-xs text-mist">
                    <th className="py-1 text-left font-medium">Duration</th>
                    <th className="text-right font-medium">n</th>
                    <th className="text-right font-medium">Rest</th>
                    <th className="text-right font-medium">Vigour</th>
                    <th className="text-right font-medium">In bed</th>
                  </tr>
                </thead>
                <tbody>
                  {ins.coSleep.buckets.map((b) => (
                    <tr key={b.label} className="border-t border-line">
                      <td className="py-1.5">{b.label}</td>
                      <td className="text-right text-mist">{b.n}</td>
                      <td className="text-right">{b.quality?.toFixed(1) ?? '—'}</td>
                      <td className="text-right">{b.energy?.toFixed(1) ?? '—'}</td>
                      <td className="text-right">{b.duration != null ? formatDuration(Math.round(b.duration)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 className="mt-4 font-serif text-[17px] italic text-mist">≥ 2h vs none</h3>
              <OutcomeRows comps={ins.coSleep.longVsNone} aLabel="≥2h" bLabel="none" />
              <h3 className="mt-4 font-serif text-[17px] italic text-mist">&lt; 2h vs none</h3>
              <OutcomeRows comps={ins.coSleep.shortVsNone} aLabel="<2h" bLabel="none" />
              <h3 className="mt-4 font-serif text-[17px] italic text-mist">Arrival before 03:00 vs after</h3>
              <OutcomeRows comps={ins.coSleep.earlyVsLate} aLabel="early" bLabel="late" />
            </Card>

            {/* Creatine */}
            <Card title="Creatine 10g">
              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: '14-day', a: c.adherence14 },
                  { label: '30-day', a: c.adherence30 },
                ].map(({ label, a }) => (
                  <div key={label} className="rounded-leaf bg-night py-2">
                    <div className="oldstyle text-[30px] leading-none">{a && a.logged ? `${Math.round((a.taken / a.logged) * 100)}%` : '—'}</div>
                    <div className="text-xs text-mist">
                      {label} {a ? `(${a.taken}/${a.logged})` : ''}
                    </div>
                  </div>
                ))}
                <div className="rounded-leaf bg-night py-2">
                  <div className="oldstyle text-[30px] leading-none">{c.streak}</div>
                  <div className="text-xs text-mist">day streak</div>
                </div>
              </div>
              <h3 className="font-serif text-[17px] italic text-mist">Morning vs evening dose</h3>
              <div className="divide-y divide-line">
                <ComparisonRow label="Latency (1 <15m · 3 >30m)" c={c.timing.latency} unit="latency" aLabel="morning" bLabel="evening" />
                <ComparisonRow label="Rest" c={c.timing.quality} unit="score" aLabel="morning" bLabel="evening" />
                <ComparisonRow label="Vigour" c={c.timing.energy} unit="score" aLabel="morning" bLabel="evening" />
              </div>
              <h3 className="mt-4 font-serif text-[17px] italic text-mist">Loaded vs unloaded (needs off-periods — likely empty)</h3>
              <OutcomeRows comps={c.loadedVsUnloaded} aLabel="loaded" bLabel="unloaded" />
              <h3 className="mt-4 font-serif text-[17px] italic text-mist">Hypothesis: vigour on visit nights, loaded vs unloaded</h3>
              <ComparisonRow label="Vigour" c={c.coSleepEnergyLoadedVsUnloaded} unit="score" aLabel="loaded" bLabel="unloaded" />
            </Card>
          </div>

          {/* Factor impact */}
          <h2 className="pt-3 font-serif text-[24px]">Factor impact (with − without)</h2>
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
