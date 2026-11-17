'use client'

import { useMemo, useState } from 'react'
import { useLogs } from './LogsProvider'
import { TrendCharts } from './InsightsView'
import { EditSheet } from './EditSheet'
import { QUALITY_RAMP } from './Charts'
import { computeInsights } from '@/lib/insights'
import { FACTOR_KEYS, FACTOR_LABELS } from '@/lib/types'
import { formatDuration, localTime } from '@/lib/time'

/** Desktop right-hand workspace: 30-day trends, headline stats, editable log table. */
export function Overview() {
  const { logs } = useLogs()
  const [editing, setEditing] = useState<string | null>(null)
  const ins = useMemo(() => computeInsights(logs, { includeSick: true }), [logs])
  const recent = logs.slice(-30)
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const avgTib = avg(recent.map((l) => l.total_duration_minutes))
  const stats = [
    { label: 'Avg in bed (30)', value: formatDuration(avgTib != null ? Math.round(avgTib) : null) },
    { label: 'Avg rest (30)', value: avg(recent.map((l) => l.sleep_quality))?.toFixed(1) ?? '—' },
    { label: 'Visit nights (30)', value: `${recent.filter((l) => l.co_sleep_occurred).length}` },
    { label: 'Bedtime SD (14)', value: ins.consistency.sd14 != null ? `±${Math.round(ins.consistency.sd14)}m` : '—' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="text-xs font-medium text-mist">{s.label}</div>
            <div className="oldstyle mt-1 text-[34px] leading-none">{s.value}</div>
          </div>
        ))}
      </div>

      <TrendCharts />

      <section className="card overflow-x-auto">
        <h2 className="eyebrow mb-4">Log</h2>
        <table className="w-full min-w-[720px] text-sm tabular-nums">
          <thead>
            <tr className="text-left text-xs text-mist">
              <th className="py-2 font-medium">Date</th>
              <th className="font-medium">Bed</th>
              <th className="font-medium">Wake</th>
              <th className="font-medium">In bed</th>
              <th className="font-medium">Rest</th>
              <th className="font-medium">Vigour</th>
              <th className="font-medium">Visit</th>
              <th className="font-medium">Factors</th>
            </tr>
          </thead>
          <tbody>
            {[...logs].reverse().map((l) => (
              <tr key={l.sleep_date} onClick={() => setEditing(l.sleep_date)} className="cursor-pointer border-t border-line hover:bg-night">
                <td className="py-2">{l.sleep_date}</td>
                <td>{localTime(l.bedtime_at, l.tz)}</td>
                <td>{localTime(l.wake_time_at, l.tz)}</td>
                <td>{formatDuration(l.total_duration_minutes)}</td>
                <td>
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-[4px_4px_9px_4px] font-serif text-[15px]"
                    style={{ background: l.sleep_quality ? QUALITY_RAMP[l.sleep_quality - 1] : '#2F4A3A', color: (l.sleep_quality ?? 0) >= 3 ? '#0F1D17' : '#EDEFE6' }}
                  >
                    {l.sleep_quality ?? '–'}
                  </span>
                </td>
                <td>{l.morning_energy ?? '–'}</td>
                <td>{l.co_sleep_occurred ? `${localTime(l.co_sleep_start_at!, l.tz)} · ${formatDuration(l.co_sleep_minutes)}` : '—'}</td>
                <td className="text-xs text-mist">
                  {[l.creatine_10g && 'Creatine', ...FACTOR_KEYS.filter((k) => l[k]).map((k) => FACTOR_LABELS[k])].filter(Boolean).join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length && <p className="py-6 text-center text-mist">No nights yet — log one on the left.</p>}
      </section>

      <EditSheet date={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
