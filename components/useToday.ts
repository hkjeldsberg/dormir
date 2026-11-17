'use client'

import { useEffect, useState } from 'react'
import { deviceTimeZone, localDate } from '@/lib/time'

/** Device-local today (YYYY-MM-DD). Null until mounted to avoid server/client TZ hydration mismatch. */
export function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null)
  useEffect(() => {
    const update = () => setToday(localDate(new Date(), deviceTimeZone()))
    update()
    const onVisible = () => document.visibilityState === 'visible' && update()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
  return today
}
