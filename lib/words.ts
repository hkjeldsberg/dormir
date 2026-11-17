// Spelled-out durations for the hero line: "eight hours & ten minutes"
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty']

export function numberWord(n: number): string {
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  return o ? `${TENS[t]}-${ONES[o]}` : TENS[t]
}

export function durationWords(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(m / 60)
  const r = m % 60
  const hp = h ? `${numberWord(h)} hour${h === 1 ? '' : 's'}` : ''
  const mp = r ? `${numberWord(r)} minute${r === 1 ? '' : 's'}` : ''
  if (hp && mp) return `${hp} & ${mp}`
  return hp || mp || 'no time'
}
